import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useInspectionDatabase } from "@/hooks/useInspectionDatabase";

export interface Defect {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  confidence: number;
}

export interface Inspection {
  id: string;
  productId: string;
  timestamp: string;
  status: "pass" | "warning" | "critical";
  defectsFound: number;
  line: string;
  defects: Defect[];
  confidence: number;
}

interface InspectionContextType {
  inspections: Inspection[];
  addInspection: (inspection: Omit<Inspection, "id" | "timestamp" | "productId" | "line">) => void;
  clearInspections: () => void;
  metrics: {
    totalInspections: number;
    passRate: number | null;
    totalDefects: number;
    criticalIssues: number;
  };
  defectDistribution: { name: string; value: number; color: string }[];
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

const defectColors: Record<string, string> = {
  // Surface defects
  "Surface Scratch": "hsl(38, 92%, 50%)",
  "Surface Defect": "hsl(38, 92%, 50%)",
  "Scratch": "hsl(38, 92%, 50%)",
  "Dent": "hsl(35, 85%, 45%)",
  "Pitting": "hsl(32, 80%, 48%)",
  "Abrasion": "hsl(40, 88%, 52%)",
  // Structural defects
  "Structural Defect": "hsl(0, 72%, 51%)",
  "Crack": "hsl(0, 72%, 51%)",
  "Fracture": "hsl(5, 75%, 48%)",
  "Deformation": "hsl(10, 70%, 50%)",
  "Warping": "hsl(15, 68%, 52%)",
  // Dimensional issues
  "Dimensional Issue": "hsl(185, 85%, 50%)",
  "Dimensional Problem": "hsl(185, 85%, 50%)",
  "Misalignment": "hsl(190, 80%, 48%)",
  "Size Irregularity": "hsl(180, 75%, 45%)",
  // Color/coating issues
  "Color Variation": "hsl(280, 70%, 55%)",
  "Coating Issue": "hsl(285, 65%, 52%)",
  "Discoloration": "hsl(275, 72%, 50%)",
  "Stain": "hsl(270, 68%, 48%)",
  // Contamination
  "Contamination": "hsl(120, 60%, 40%)",
  "Foreign Particle": "hsl(125, 55%, 42%)",
  "Debris": "hsl(115, 58%, 38%)",
  // Assembly defects
  "Assembly Defect": "hsl(200, 70%, 50%)",
  "Missing Part": "hsl(205, 65%, 48%)",
  "Improper Assembly": "hsl(195, 72%, 52%)",
  // Edge issues
  "Edge Irregularity": "hsl(45, 85%, 50%)",
  "Edge Defect": "hsl(48, 82%, 48%)",
};

const productLines = ["Line A", "Line B", "Line C", "Line D"];

function generateProductId(): string {
  const prefix = ["PRD", "CMP", "ASM"][Math.floor(Math.random() * 3)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${number}`;
}

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const { saveInspection } = useInspectionDatabase(setInspections);

  const addInspection = useCallback((inspectionData: Omit<Inspection, "id" | "timestamp" | "productId" | "line">) => {
    const newInspection: Inspection = {
      ...inspectionData,
      id: `INS-${Date.now()}`,
      productId: generateProductId(),
      timestamp: new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }),
      line: productLines[Math.floor(Math.random() * productLines.length)],
    };
    
    // Save to database (will update state via realtime subscription)
    saveInspection(newInspection);
    
    // Optimistically update local state
    setInspections((prev) => {
      if (prev.some((i) => i.id === newInspection.id)) {
        return prev;
      }
      return [newInspection, ...prev];
    });
  }, [saveInspection]);

  const clearInspections = () => {
    setInspections([]);
  };

  // Count as "pass" if status is pass OR if all defects are low/medium severity (minor issues)
  const passCount = inspections.filter((i) => {
    if (i.status === "pass") return true;
    if (i.status === "warning" && i.defects.every((d) => d.severity === "low" || d.severity === "medium")) return true;
    return false;
  }).length;

  // Count as critical if status is critical OR any defect has critical severity
  const criticalCount = inspections.filter((i) => 
    i.status === "critical" || i.defects.some((d) => d.severity === "critical")
  ).length;

  const metrics = {
    totalInspections: inspections.length,
    passRate: inspections.length > 0 ? (passCount / inspections.length) * 100 : null,
    totalDefects: inspections.reduce((sum, i) => sum + i.defectsFound, 0),
    criticalIssues: criticalCount,
  };

  const defectDistribution = (() => {
    const counts: Record<string, number> = {};
    inspections.forEach((inspection) => {
      inspection.defects.forEach((defect) => {
        counts[defect.type] = (counts[defect.type] || 0) + 1;
      });
    });
    
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: defectColors[name] || "hsl(220, 70%, 50%)",
    }));
  })();

  return (
    <InspectionContext.Provider
      value={{
        inspections,
        addInspection,
        clearInspections,
        metrics,
        defectDistribution,
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (context === undefined) {
    throw new Error("useInspection must be used within an InspectionProvider");
  }
  return context;
}
