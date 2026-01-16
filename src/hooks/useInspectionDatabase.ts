import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Inspection } from "@/context/InspectionContext";
import { toast } from "@/hooks/use-toast";

export function useInspectionDatabase(
  setInspections: React.Dispatch<React.SetStateAction<Inspection[]>>
) {
  // Load inspections from database on mount
  useEffect(() => {
    const loadInspections = async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error loading inspections:", error);
        return;
      }

      if (data) {
        const mappedInspections: Inspection[] = data.map((row) => ({
          id: row.inspection_id,
          productId: row.product_id,
          timestamp: new Date(row.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          status: row.status as "pass" | "warning" | "critical",
          defectsFound: row.defects_found,
          line: row.production_line,
          defects: (row.defects as any[]) || [],
          confidence: Number(row.confidence),
        }));
        setInspections(mappedInspections);
      }
    };

    loadInspections();
  }, [setInspections]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("inspections-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inspections",
        },
        (payload) => {
          const row = payload.new;
          const newInspection: Inspection = {
            id: row.inspection_id,
            productId: row.product_id,
            timestamp: new Date(row.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            status: row.status as "pass" | "warning" | "critical",
            defectsFound: row.defects_found,
            line: row.production_line,
            defects: (row.defects as any[]) || [],
            confidence: Number(row.confidence),
          };
          
          setInspections((prev) => {
            // Avoid duplicates
            if (prev.some((i) => i.id === newInspection.id)) {
              return prev;
            }
            return [newInspection, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setInspections]);

  // Save inspection to database
  const saveInspection = useCallback(async (inspection: Inspection) => {
    // Get current user for user_id
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save inspections.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("inspections").insert([{
      inspection_id: inspection.id,
      product_id: inspection.productId,
      production_line: inspection.line,
      status: inspection.status,
      defects_found: inspection.defectsFound,
      confidence: inspection.confidence,
      defects: inspection.defects as any,
      user_id: user.id,
    }]);

    if (error) {
      console.error("Error saving inspection:", error);
      toast({
        title: "Failed to save inspection",
        description: error.message,
        variant: "destructive",
      });
    }
  }, []);

  return { saveInspection };
}
