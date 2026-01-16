import { useState } from "react";
import { FileText, Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspection } from "@/context/InspectionContext";
import { generateReport, downloadReport, printReport } from "@/services/reportService";
import { toast } from "@/hooks/use-toast";

export function ReportGenerator() {
  const { inspections } = useInspection();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async (action: "download" | "print") => {
    if (inspections.length === 0) {
      toast({
        title: "No inspections",
        description: "Analyze some images first to generate a report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const html = await generateReport(
        inspections,
        inspections.length === 1 ? "single" : "daily"
      );

      if (action === "download") {
        const filename = `inspection-report-${new Date().toISOString().split("T")[0]}.html`;
        downloadReport(html, filename);
        toast({
          title: "Report Downloaded",
          description: "Your inspection report has been downloaded.",
        });
      } else {
        printReport(html);
      }
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 card-glow">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">Generate Report</h3>
          <p className="text-xs text-muted-foreground">
            {inspections.length} inspection{inspections.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateReport("download")}
          disabled={isGenerating || inspections.length === 0}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateReport("print")}
          disabled={isGenerating || inspections.length === 0}
          className="flex-1"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
