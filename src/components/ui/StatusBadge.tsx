import { cn } from "@/lib/utils";

type Status = "pass" | "warning" | "critical" | "analyzing";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig = {
  pass: {
    label: "PASS",
    className: "bg-success/20 text-success border-success/30",
  },
  warning: {
    label: "WARNING",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  critical: {
    label: "CRITICAL",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
  analyzing: {
    label: "ANALYZING",
    className: "bg-primary/20 text-primary border-primary/30 status-pulse",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border",
        config.className,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-2", {
        "bg-success": status === "pass",
        "bg-warning": status === "warning",
        "bg-destructive": status === "critical",
        "bg-primary": status === "analyzing",
      })} />
      {config.label}
    </span>
  );
}
