import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DefectAnalysisResult {
  overall_status: "pass" | "warning" | "critical";
  confidence: number;
  defects: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    location: string;
    description: string;
    confidence: number;
  }>;
}

// Constants for validation
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["png", "jpeg", "jpg", "webp", "gif"];

// Validate base64 image format and size
function validateImageInput(imageBase64: unknown): { valid: boolean; error?: string } {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return { valid: false, error: "Invalid image data: must be a non-empty string" };
  }

  // Check if it's a valid data URL format
  const dataUrlRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
  const match = imageBase64.match(dataUrlRegex);
  
  if (!match) {
    return { valid: false, error: `Invalid image format. Must be base64-encoded image with data URL prefix. Supported types: ${ALLOWED_IMAGE_TYPES.join(", ")}` };
  }

  // Extract base64 portion and validate characters
  const base64Part = imageBase64.split(",")[1];
  if (!base64Part) {
    return { valid: false, error: "Invalid base64 data: missing encoded content" };
  }

  // Validate base64 characters
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(base64Part)) {
    return { valid: false, error: "Invalid base64 encoding: contains invalid characters" };
  }

  // Estimate decoded size (base64 is ~33% larger than binary)
  const estimatedSize = (base64Part.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB` };
  }

  return { valid: true };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS preflight
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

    const { imageBase64 } = requestBody as { imageBase64?: unknown };

    // Comprehensive image validation
    const validation = validateImageInput(imageBase64);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert manufacturing quality control AI inspector. Analyze the provided product image for defects.

SEVERITY CLASSIFICATION (be conservative - do NOT over-classify):
- "low": Minor cosmetic issues barely visible, no functional impact (light surface marks, minor dust, tiny scratches only visible under close inspection)
- "medium": Noticeable cosmetic defects that don't affect function (visible scratches, small dents, minor discoloration)
- "high": Significant defects that may affect product quality or longevity (deep scratches, notable dents, coating damage)
- "critical": ONLY for severe defects that make product unusable or unsafe (structural cracks, major breaks, complete coating failure, safety hazards)

OVERALL STATUS RULES (be conservative):
- "pass": No defects OR only low-severity cosmetic issues
- "warning": Medium or high severity defects present, product still functional
- "critical": ONLY when defects genuinely make product unusable or pose safety risks

IMPORTANT: Most scratches and surface marks should be classified as "low" or "medium" severity. Reserve "high" for deep damage and "critical" ONLY for truly severe, function-affecting defects.

Return ONLY valid JSON:
{
  "overall_status": "pass" | "warning" | "critical",
  "confidence": <number 0-100>,
  "defects": [
    {
      "type": "<category: Surface defects, Structural issues, Dimensional problems, Color/coating issues, Contamination, Assembly defects>",
      "severity": "low" | "medium" | "high" | "critical",
      "location": "<where on the product>",
      "description": "<detailed explanation>",
      "confidence": <number 0-100>
    }
  ]
}

Be precise. Only report defects clearly visible. If image is unclear, return valid JSON with "pass" status.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this product image for manufacturing defects. Return ONLY valid JSON, no markdown or explanation.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64 as string,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from AI
    let analysisResult: DefectAnalysisResult;
    try {
      // Clean up potential markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI analysis result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize the response
    const validStatuses = ["pass", "warning", "critical"];
    if (!validStatuses.includes(analysisResult.overall_status)) {
      analysisResult.overall_status = "warning";
    }

    analysisResult.confidence = Math.min(100, Math.max(0, analysisResult.confidence || 85));
    analysisResult.defects = (analysisResult.defects || []).map((defect) => ({
      type: String(defect.type || "Unknown Defect").slice(0, 100),
      severity: ["low", "medium", "high", "critical"].includes(defect.severity) 
        ? defect.severity 
        : "medium",
      location: String(defect.location || "Unknown location").slice(0, 200),
      description: String(defect.description || "No description provided").slice(0, 500),
      confidence: Math.min(100, Math.max(0, defect.confidence || 80)),
    }));

    console.log("Analysis complete:", analysisResult);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-defect function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
