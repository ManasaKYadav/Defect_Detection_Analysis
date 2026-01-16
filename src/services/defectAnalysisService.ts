import { supabase } from "@/integrations/supabase/client";

export interface AnalyzedDefect {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  description: string;
  confidence: number;
}

export interface AnalysisResult {
  overall_status: "pass" | "warning" | "critical";
  confidence: number;
  defects: AnalyzedDefect[];
}

export interface AnalysisError {
  error: string;
  status?: number;
}

export async function analyzeImageForDefects(imageBase64: string): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke<AnalysisResult | AnalysisError>(
    "analyze-defect",
    {
      body: { imageBase64 },
    }
  );

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message || "Failed to connect to AI service");
  }

  if (!data) {
    throw new Error("No response from AI service");
  }

  // Check if the response is an error
  if ("error" in data && typeof data.error === "string") {
    throw new Error(data.error);
  }

  return data as AnalysisResult;
}
