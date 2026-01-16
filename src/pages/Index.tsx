import { Gauge, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/ui/MetricCard";
import { DefectAnalyzer } from "@/components/DefectAnalyzer";
import { RecentInspections } from "@/components/RecentInspections";
import { DefectChart } from "@/components/DefectChart";
import { BatchUploader } from "@/components/BatchUploader";
import { ReportGenerator } from "@/components/ReportGenerator";
import { InspectionProvider, useInspection } from "@/context/InspectionContext";

const DashboardContent = () => {
  const { metrics } = useInspection();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Inspections Today"
            value={metrics.totalInspections.toString()}
            icon={Gauge}
          />
          <MetricCard
            title="Pass Rate"
            value={metrics.passRate !== null ? `${metrics.passRate.toFixed(1)}%` : "-"}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Defects Detected"
            value={metrics.totalDefects.toString()}
            icon={AlertTriangle}
            variant="warning"
          />
          <MetricCard
            title="Critical Issues"
            value={metrics.criticalIssues.toString()}
            icon={TrendingUp}
            variant="destructive"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <DefectAnalyzer />
          </div>
          <div className="space-y-6">
            <DefectChart />
            <ReportGenerator />
          </div>
        </div>

        {/* Batch Uploader */}
        <div className="mb-8">
          <BatchUploader />
        </div>

        {/* Recent Inspections */}
        <RecentInspections />
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-mono">
              DefectVision v2.4.1 • AI Engine: Active • Last calibration: 2h ago
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 Industrial AI Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Index = () => {
  return (
    <InspectionProvider>
      <DashboardContent />
    </InspectionProvider>
  );
};

export default Index;
