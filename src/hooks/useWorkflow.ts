import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkflowInstance = Database["public"]["Tables"]["workflow_instances"]["Row"];
export type WorkflowDefinition = Database["public"]["Tables"]["workflow_definitions"]["Row"];
export type WorkflowStep = Database["public"]["Tables"]["workflow_steps"]["Row"];
export type WorkflowApproval = Database["public"]["Tables"]["workflow_approvals"]["Row"];
export type WorkflowDecision = Database["public"]["Enums"]["workflow_approval_decision"];

export interface WorkflowFullState {
  instance: WorkflowInstance | null;
  definition: WorkflowDefinition | null;
  steps: WorkflowStep[];
  approvals: WorkflowApproval[];
}

/**
 * Load the active workflow instance (if any) for a given entity, plus its definition,
 * steps, and approval log. Subscribes to realtime changes.
 */
export function useWorkflow(entityType: string, entityId?: string | null) {
  const [state, setState] = useState<WorkflowFullState>({
    instance: null,
    definition: null,
    steps: [],
    approvals: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: instances, error: instErr } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("started_at", { ascending: false })
        .limit(1);
      if (instErr) throw instErr;
      const instance = instances?.[0] ?? null;
      if (!instance) {
        setState({ instance: null, definition: null, steps: [], approvals: [] });
        return;
      }
      const [defRes, stepsRes, apprRes] = await Promise.all([
        supabase.from("workflow_definitions").select("*").eq("id", instance.definition_id).maybeSingle(),
        supabase
          .from("workflow_steps")
          .select("*")
          .eq("definition_id", instance.definition_id)
          .order("step_order", { ascending: true }),
        supabase
          .from("workflow_approvals")
          .select("*")
          .eq("instance_id", instance.id)
          .order("decided_at", { ascending: true }),
      ]);
      setState({
        instance,
        definition: defRes.data ?? null,
        steps: stepsRes.data ?? [],
        approvals: apprRes.data ?? [],
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!entityId) return;
    const channel = supabase
      .channel(`workflow:${entityType}:${entityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_instances", filter: `entity_id=eq.${entityId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_approvals" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId, load]);

  const startWorkflow = useCallback(
    async (definitionId: string, projectId?: string | null, metadata?: Record<string, unknown>) => {
      if (!entityId) throw new Error("entityId required");
      const { data, error } = await supabase.rpc("start_workflow", {
        _definition_id: definitionId,
        _entity_type: entityType,
        _entity_id: entityId,
        _project_id: projectId ?? null,
        _metadata: (metadata ?? {}) as any,
      });
      if (error) throw error;
      await load();
      return data as string;
    },
    [entityType, entityId, load],
  );

  const decideStep = useCallback(
    async (instanceId: string, decision: WorkflowDecision, comment?: string) => {
      const { error } = await supabase.rpc("decide_workflow_step", {
        _instance_id: instanceId,
        _decision: decision,
        _comment: comment ?? null,
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  const cancelWorkflow = useCallback(
    async (instanceId: string, reason?: string) => {
      const { error } = await supabase.rpc("cancel_workflow", {
        _instance_id: instanceId,
        _reason: reason ?? null,
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  const currentStep = useMemo(() => {
    if (!state.instance) return null;
    return state.steps.find((s) => s.step_order === state.instance!.current_step_order) ?? null;
  }, [state]);

  return {
    ...state,
    currentStep,
    loading,
    error,
    refresh: load,
    startWorkflow,
    decideStep,
    cancelWorkflow,
  };
}

/** List active workflow definitions for a given entity type. */
export function useWorkflowDefinitions(entityType?: string) {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("workflow_definitions").select("*").eq("is_active", true);
      if (entityType) q = q.eq("entity_type", entityType);
      const { data } = await q.order("name", { ascending: true });
      if (!cancelled) {
        setDefinitions(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  return { definitions, loading };
}
