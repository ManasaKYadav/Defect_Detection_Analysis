import { supabase } from "@/integrations/supabase/client";
import { Inspection } from "@/context/InspectionContext";

interface ReportResponse {
  html: string;
  reportType: string;
}

export async function generateReport(
  inspections: Inspection[],
  reportType: "single" | "daily" | "batch",
  title?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<ReportResponse>("generate-report", {
    body: { inspections, reportType, title },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate report");
  }

  if (!data?.html) {
    throw new Error("No report generated");
  }

  return data.html;
}

export function downloadReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReport(html: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
