import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useInspection } from "@/context/InspectionContext";

export function DefectChart() {
  const { defectDistribution } = useInspection();

  const hasData = defectDistribution.length > 0;

  return (
    <div className="bg-card rounded-lg p-6 card-glow h-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Defect Distribution</h2>
        <p className="text-sm text-muted-foreground">Breakdown by category (Today)</p>
      </div>

      {hasData ? (
        <>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={defectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {defectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "8px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 96%)" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {defectDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                <span className="text-xs font-mono text-foreground ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <PieChart className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No defects analyzed yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload an image to see distribution</p>
        </div>
      )}
    </div>
  );
}
