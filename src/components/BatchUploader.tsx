import { useState, useCallback } from "react";
import { Upload, Images, Loader2, CheckCircle, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useInspection } from "@/context/InspectionContext";
import { analyzeImageForDefects } from "@/services/defectAnalysisService";
import { toast } from "@/hooks/use-toast";

interface BatchImage {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "analyzing" | "complete" | "error";
  result?: {
    status: "pass" | "warning" | "critical";
    defectsFound: number;
  };
  error?: string;
}

export function BatchUploader() {
  const { addInspection } = useInspection();
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    
    const newImages: BatchImage[] = imageFiles.map((file) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));
    
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    
    const newImages: BatchImage[] = imageFiles.map((file) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));
    
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const processImages = useCallback(async () => {
    const pendingImages = images.filter((img) => img.status === "pending");
    if (pendingImages.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    let completed = 0;

    for (const image of pendingImages) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: "analyzing" } : img
        )
      );

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(image.file);
        });

        const result = await analyzeImageForDefects(base64);

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: "complete",
                  result: {
                    status: result.overall_status,
                    defectsFound: result.defects.length,
                  },
                }
              : img
          )
        );

        // Add to inspection context
        addInspection({
          status: result.overall_status,
          confidence: result.confidence,
          defectsFound: result.defects.length,
          defects: result.defects.map((d) => ({
            type: d.type,
            severity: d.severity,
            location: d.location,
            confidence: d.confidence,
          })),
        });
      } catch (error) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: "error",
                  error: error instanceof Error ? error.message : "Analysis failed",
                }
              : img
          )
        );
      }

      completed++;
      setProgress((completed / pendingImages.length) * 100);
      
      // Small delay between requests to avoid rate limiting
      if (completed < pendingImages.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setIsProcessing(false);
    
    const successCount = images.filter((img) => img.status === "complete").length + 
      pendingImages.filter((_, i) => i < completed).length;
    
    toast({
      title: "Batch Processing Complete",
      description: `Analyzed ${completed} images successfully.`,
    });
  }, [images, addInspection]);

  const clearAll = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setProgress(0);
  }, [images]);

  const pendingCount = images.filter((img) => img.status === "pending").length;
  const completeCount = images.filter((img) => img.status === "complete").length;
  const errorCount = images.filter((img) => img.status === "error").length;

  return (
    <div className="bg-card rounded-lg p-6 card-glow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Batch Processing</h2>
          <p className="text-sm text-muted-foreground">Upload multiple images for bulk analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-mono text-muted-foreground">{images.length} images</span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4",
          "border-border hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag & drop multiple images here
        </p>
        <label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
          <span className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors">
            Select Files
          </span>
        </label>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={image.preview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    image.status === "analyzing" && "bg-background/80",
                    image.status === "complete" && "bg-success/30",
                    image.status === "error" && "bg-destructive/30"
                  )}
                >
                  {image.status === "analyzing" && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {image.status === "complete" && (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
                  {image.status === "error" && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                {image.status === "pending" && !isProcessing && (
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center font-mono">
                Processing... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>Pending: {pendingCount}</span>
              <span className="text-success">Complete: {completeCount}</span>
              {errorCount > 0 && <span className="text-destructive">Errors: {errorCount}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={processImages}
              disabled={isProcessing || pendingCount === 0}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Analyze {pendingCount} Images
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={isProcessing}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
