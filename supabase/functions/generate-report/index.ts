import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants for validation
const MAX_INSPECTIONS = 100;
const MAX_STRING_LENGTH = 200;
const MAX_DEFECTS_PER_INSPECTION = 50;

// HTML escape function to prevent XSS
function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Safe string truncation
function safeString(value: unknown, maxLength: number = MAX_STRING_LENGTH): string {
  if (value === null || value === undefined) {
    return "";
  }
  return escapeHtml(String(value).slice(0, maxLength));
}

// Safe number validation
function safeNumber(value: unknown, defaultValue: number, min: number = 0, max: number = 100): number {
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return Math.min(max, Math.max(min, num));
}

interface Defect {
  type: string;
  severity: string;
  location: string;
  confidence: number;
}

interface Inspection {
  id: string;
  productId: string;
  timestamp: string;
  status: string;
  defectsFound: number;
  line: string;
  defects: Defect[];
  confidence: number;
}

interface ReportRequest {
  inspections: Inspection[];
  reportType: "single" | "daily" | "batch";
  title?: string;
}

// Validate and sanitize a single defect
function validateDefect(defect: unknown): Defect | null {
  if (typeof defect !== "object" || defect === null) {
    return null;
  }

  const d = defect as Record<string, unknown>;
  const validSeverities = ["low", "medium", "high", "critical"];
  const severity = validSeverities.includes(String(d.severity)) ? String(d.severity) : "medium";

  return {
    type: safeString(d.type, 100) || "Unknown",
    severity,
    location: safeString(d.location, 200) || "Unknown",
    confidence: safeNumber(d.confidence, 80),
  };
}

// Validate and sanitize a single inspection
function validateInspection(inspection: unknown): Inspection | null {
  if (typeof inspection !== "object" || inspection === null) {
    return null;
  }

  const i = inspection as Record<string, unknown>;
  const validStatuses = ["pass", "warning", "critical"];
  const status = validStatuses.includes(String(i.status)) ? String(i.status) : "warning";

  // Validate defects array
  let defects: Defect[] = [];
  if (Array.isArray(i.defects)) {
    defects = i.defects
      .slice(0, MAX_DEFECTS_PER_INSPECTION)
      .map(validateDefect)
      .filter((d): d is Defect => d !== null);
  }

  return {
    id: safeString(i.id, 50) || "Unknown",
    productId: safeString(i.productId, 50) || "Unknown",
    timestamp: safeString(i.timestamp, 50) || new Date().toISOString(),
    status,
    defectsFound: safeNumber(i.defectsFound, 0, 0, 1000),
    line: safeString(i.line, 50) || "Unknown",
    defects,
    confidence: safeNumber(i.confidence, 80),
  };
}

// Validate report type
function validateReportType(reportType: unknown): "single" | "daily" | "batch" {
  const validTypes = ["single", "daily", "batch"];
  if (validTypes.includes(String(reportType))) {
    return reportType as "single" | "daily" | "batch";
  }
  return "single";
}

function generateHTML(inspections: Inspection[], reportType: string, title?: string): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalInspections = inspections.length;
  const passCount = inspections.filter((i) => i.status === "pass").length;
  const warningCount = inspections.filter((i) => i.status === "warning").length;
  const criticalCount = inspections.filter((i) => i.status === "critical").length;
  const totalDefects = inspections.reduce((sum, i) => sum + i.defectsFound, 0);
  const passRate = totalInspections > 0 ? ((passCount / totalInspections) * 100).toFixed(1) : "0";

  // Title is already sanitized via safeString
  const reportTitle = title || (reportType === "single" 
    ? `Inspection Report - ${inspections[0]?.id || "Unknown"}`
    : reportType === "daily" 
    ? "Daily Quality Control Report"
    : "Batch Inspection Report");

  const inspectionRows = inspections.map((inspection) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${inspection.id}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inspection.productId}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inspection.line}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <span style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background-color: ${inspection.status === 'pass' ? '#dcfce7' : inspection.status === 'warning' ? '#fef9c3' : '#fee2e2'};
          color: ${inspection.status === 'pass' ? '#166534' : inspection.status === 'warning' ? '#854d0e' : '#991b1b'};
        ">${inspection.status}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: ${inspection.defectsFound > 0 ? '#dc2626' : '#6b7280'};">${inspection.defectsFound}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${inspection.confidence.toFixed(1)}%</td>
    </tr>
    ${inspection.defects.length > 0 ? `
    <tr>
      <td colspan="6" style="padding: 0; background-color: #f8fafc;">
        <div style="padding: 12px 24px;">
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Detected Defects:</p>
          ${inspection.defects.map((d) => `
            <div style="display: inline-block; margin-right: 12px; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
              <strong style="color: #1e293b;">${d.type}</strong>
              <span style="
                margin-left: 8px;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
                background-color: ${d.severity === 'critical' ? '#fee2e2' : d.severity === 'high' ? '#ffedd5' : d.severity === 'medium' ? '#fef9c3' : '#f0fdf4'};
                color: ${d.severity === 'critical' ? '#991b1b' : d.severity === 'high' ? '#9a3412' : d.severity === 'medium' ? '#854d0e' : '#166534'};
              ">${d.severity}</span>
              <br>
              <small style="color: #64748b;">${d.location} • ${d.confidence.toFixed(1)}% confidence</small>
            </div>
          `).join("")}
        </div>
      </td>
    </tr>
    ` : ""}
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background-color: #f1f5f9; color: #1e293b;">
  <div style="max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 32px; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px;">${reportTitle}</h1>
      <p style="margin: 0; opacity: 0.9;">Generated: ${date}</p>
    </div>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #1e40af;">${totalInspections}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Total Inspections</p>
      </div>
      <div style="background: #dcfce7; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #166534;">${passRate}%</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #166534; text-transform: uppercase;">Pass Rate</p>
      </div>
      <div style="background: #fef9c3; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #854d0e;">${totalDefects}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #854d0e; text-transform: uppercase;">Total Defects</p>
      </div>
      <div style="background: #fee2e2; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #991b1b;">${criticalCount}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b; text-transform: uppercase;">Critical Issues</p>
      </div>
    </div>

    <!-- Inspections Table -->
    <div style="padding: 0 24px 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">Inspection Details</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">ID</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">Product</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">Line</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">Defects</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px;">Confidence</th>
          </tr>
        </thead>
        <tbody>
          ${inspectionRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
        DefectVision AI Quality Control System • Report ID: RPT-${Date.now()}
      </p>
    </div>
  </div>
</body>
</html>
`;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request body structure
    if (typeof requestBody !== "object" || requestBody === null) {
      return new Response(
        JSON.stringify({ error: "Request body must be a JSON object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = requestBody as Record<string, unknown>;

    // Validate inspections array exists and is an array
    if (!Array.isArray(body.inspections)) {
      return new Response(
        JSON.stringify({ error: "inspections must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.inspections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No inspections provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.inspections.length > MAX_INSPECTIONS) {
      return new Response(
        JSON.stringify({ error: `Too many inspections. Maximum allowed is ${MAX_INSPECTIONS}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize each inspection
    const inspections: Inspection[] = body.inspections
      .map(validateInspection)
      .filter((i): i is Inspection => i !== null);

    if (inspections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid inspections found in request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate report type
    const reportType = validateReportType(body.reportType);

    // Sanitize optional title
    const title = body.title ? safeString(body.title, 200) : undefined;

    const html = generateHTML(inspections, reportType, title);

    return new Response(
      JSON.stringify({ html, reportType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
