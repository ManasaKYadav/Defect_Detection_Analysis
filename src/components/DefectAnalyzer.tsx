import { useState, useCallback } from "react";
import { Upload, Scan, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { useInspection, Defect } from "@/context/InspectionContext";
import { analyzeImageForDefects } from "@/services/defectAnalysisService";
import { toast } from "@/hooks/use-toast";

interface DefectResult {
  status: "pass" | "warning" | "critical";
  confidence: number;
  defects: Defect[];
}

export function DefectAnalyzer() {
  const { addInspection } = useInspection();
  const [isDragging, setIsDragging] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [result, setResult] = useState<DefectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  }, [processImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const analyzeImage = useCallback(async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisStep("Sending image to AI...");
    
    try {
      setAnalysisStep("AI analyzing for defects...");
      
      const analysisResult = await analyzeImageForDefects(image);
      
      setAnalysisStep("Processing results...");
      
      // Map the AI response to our format
      const defectResult: DefectResult = {
        status: analysisResult.overall_status,
        confidence: analysisResult.confidence,
        defects: analysisResult.defects.map((d) => ({
          type: d.type,
          severity: d.severity,
          location: d.location,
          confidence: d.confidence,
        })),
      };
      
      setResult(defectResult);
      
      // Add to inspection context
      addInspection({
        status: defectResult.status,
        confidence: defectResult.confidence,
        defectsFound: defectResult.defects.length,
        defects: defectResult.defects,
      });
      
      toast({
        title: "Analysis Complete",
        description: defectResult.status === "pass" 
          ? "No defects detected in this product." 
          : `Found ${defectResult.defects.length} defect(s).`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  }, [image, addInspection]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-warning";
      case "medium": return "text-warning";
      case "high": return "text-destructive";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 card-glow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Defect Analyzer</h2>
          <p className="text-sm text-muted-foreground">Real AI-powered quality inspection</p>
        </div>
        {result && <StatusBadge status={result.status} />}
        {isAnalyzing && <StatusBadge status="analyzing" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50",
            image ? "aspect-square" : "aspect-video"
          )}
        >
          {image ? (
            <>
              <img
                src={image}
                alt="Product to analyze"
                className="w-full h-full object-cover"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                      <Scan className="absolute inset-0 m-auto h-10 w-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{analysisStep}</p>
                  </div>
                </div>
              )}
              {/* Scan line effect */}
              {isAnalyzing && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scan-line" />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-2">
                Drag & drop product image here
              </p>
              <p className="text-xs text-muted-foreground mb-4">or</p>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors">
                  Browse Files
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {image && !result && !isAnalyzing && !error && (
            <Button
              onClick={analyzeImage}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Scan className="mr-2 h-5 w-5" />
              Analyze for Defects
            </Button>
          )}

          {error && (
            <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/30 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Analysis Failed</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                onClick={analyzeImage}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Analysis
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Overall Result */}
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  result.status === "pass" && "bg-success/10 border-success/30",
                  result.status === "warning" && "bg-warning/10 border-warning/30",
                  result.status === "critical" && "bg-destructive/10 border-destructive/30"
                )}
              >
                <div className="flex items-center gap-3">
                  {result.status === "pass" && <CheckCircle className="h-6 w-6 text-success" />}
                  {result.status === "warning" && <AlertTriangle className="h-6 w-6 text-warning" />}
                  {result.status === "critical" && <XCircle className="h-6 w-6 text-destructive" />}
                  <div>
                    <p className="font-semibold">
                      {result.status === "pass" && "No Defects Detected"}
                      {result.status === "warning" && (
                        result.defects.some((d) => d.severity === "high") 
                          ? "Defects Found" 
                          : "Minor Defects Found"
                      )}
                      {result.status === "critical" && "Critical Defects Detected"}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      AI Confidence: {result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Defect List */}
              {result.defects.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Detected Issues</h3>
                  {result.defects.map((defect, index) => (
                    <div
                      key={index}
                      className="p-3 bg-secondary/50 rounded-lg border border-border animate-slide-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{defect.type}</p>
                          <p className="text-xs text-muted-foreground">{defect.location}</p>
                        </div>
                        <div className="text-right">
                          <span className={cn("text-xs font-mono uppercase", getSeverityColor(defect.severity))}>
                            {defect.severity}
                          </span>
                          <p className="text-xs text-muted-foreground font-mono">
                            {defect.confidence.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setImage(null);
                  setResult(null);
                  setError(null);
                }}
                className="w-full"
              >
                Analyze Another Image
              </Button>
            </div>
          )}

          {!image && (
            <div className="p-4 bg-secondary/30 rounded-lg border border-border">
              <h3 className="text-sm font-medium mb-2">AI Detection Capabilities</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Surface defects (scratches, dents, pitting)</li>
                <li>• Structural issues (cracks, deformations)</li>
                <li>• Color/coating problems</li>
                <li>• Contamination detection</li>
                <li>• Assembly & dimensional defects</li>
              </ul>
              <p className="text-xs text-primary mt-3 font-medium">
                Powered by Google Gemini Vision AI
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
