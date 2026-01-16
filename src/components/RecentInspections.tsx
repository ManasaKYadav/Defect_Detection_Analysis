import { StatusBadge } from "@/components/ui/StatusBadge";
import { useInspection } from "@/context/InspectionContext";
import { ClipboardList } from "lucide-react";

export function RecentInspections() {
  const { inspections } = useInspection();

  return (
    <div className="bg-card rounded-lg p-6 card-glow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Recent Inspections</h2>
          <p className="text-sm text-muted-foreground">Live production line monitoring</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-success font-mono">
          <span className="w-2 h-2 rounded-full bg-success status-pulse" />
          LIVE
        </span>
      </div>

      {inspections.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">
                  INSPECTION ID
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">
                  PRODUCT
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">
                  LINE
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">
                  STATUS
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
                  DEFECTS
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
                  TIME
                </th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((inspection, index) => (
                <tr
                  key={inspection.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-3 px-2">
                    <span className="font-mono text-sm text-foreground">{inspection.id}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {inspection.productId}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-muted-foreground">{inspection.line}</span>
                  </td>
                  <td className="py-3 px-2">
                    <StatusBadge status={inspection.status} />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span
                      className={`font-mono text-sm ${
                        inspection.defectsFound > 0
                          ? inspection.status === "critical"
                            ? "text-destructive"
                            : "text-warning"
                          : "text-muted-foreground"
                      }`}
                    >
                      {inspection.defectsFound}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-xs text-muted-foreground">{inspection.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No inspections yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload an image to start analyzing</p>
        </div>
      )}
    </div>
  );
}
