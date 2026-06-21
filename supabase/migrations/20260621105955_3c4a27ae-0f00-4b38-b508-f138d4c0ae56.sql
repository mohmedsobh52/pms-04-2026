-- ============================================================
-- Phase A — Workflow Engine
-- ============================================================

-- Enum for instance status
DO $$ BEGIN
  CREATE TYPE public.workflow_instance_status AS ENUM ('pending','in_progress','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_approval_decision AS ENUM ('approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) workflow_definitions ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  entity_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workflow_definitions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active definitions"
  ON public.workflow_definitions FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage definitions"
  ON public.workflow_definitions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) workflow_steps ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  name text NOT NULL,
  approver_role public.app_role,
  approver_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_hours integer,
  allow_parallel boolean NOT NULL DEFAULT false,
  condition_expression text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, step_order),
  CHECK (approver_role IS NOT NULL OR approver_user_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_steps TO authenticated;
GRANT ALL ON public.workflow_steps TO service_role;

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read steps of readable definitions"
  ON public.workflow_steps FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workflow_definitions d
    WHERE d.id = definition_id
      AND (d.is_active = true OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins manage steps"
  ON public.workflow_steps FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) workflow_instances --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  project_id uuid,
  current_step_order integer NOT NULL DEFAULT 1,
  status public.workflow_instance_status NOT NULL DEFAULT 'pending',
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity
  ON public.workflow_instances (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_project
  ON public.workflow_instances (project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status
  ON public.workflow_instances (status) WHERE status IN ('pending','in_progress');

GRANT SELECT, INSERT, UPDATE ON public.workflow_instances TO authenticated;
GRANT ALL ON public.workflow_instances TO service_role;

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

-- Visibility: project owner, the starter, an assigned approver (role or user), or admin
CREATE POLICY "Workflow instance visibility"
  ON public.workflow_instances FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR started_by = auth.uid()
    OR (project_id IS NOT NULL AND public.user_owns_project(project_id))
    OR EXISTS (
      SELECT 1 FROM public.workflow_steps s
      WHERE s.definition_id = definition_id
        AND (
          s.approver_user_id = auth.uid()
          OR (s.approver_role IS NOT NULL AND public.has_role(auth.uid(), s.approver_role))
        )
    )
  );

CREATE POLICY "Owners or admins start workflows"
  ON public.workflow_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    started_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (project_id IS NOT NULL AND public.user_owns_project(project_id))
    )
  );

CREATE POLICY "System/admin update instance"
  ON public.workflow_instances FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR started_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR started_by = auth.uid());

CREATE TRIGGER trg_workflow_instances_updated_at
  BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) workflow_approvals (immutable log) ----------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE RESTRICT,
  step_order integer NOT NULL,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision public.workflow_approval_decision NOT NULL,
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance
  ON public.workflow_approvals (instance_id, step_order);

GRANT SELECT, INSERT ON public.workflow_approvals TO authenticated;
GRANT ALL ON public.workflow_approvals TO service_role;

ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read approvals of visible instances"
  ON public.workflow_approvals FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workflow_instances wi
    WHERE wi.id = instance_id
  ));

CREATE POLICY "Approvers insert their decision"
  ON public.workflow_approvals FOR INSERT
  TO authenticated
  WITH CHECK (approver_id = auth.uid());

-- Block UPDATE and DELETE entirely (immutable log) by NOT creating those policies.

-- 5) Functions ----------------------------------------------------------

-- start_workflow: create instance for an entity
CREATE OR REPLACE FUNCTION public.start_workflow(
  _definition_id uuid,
  _entity_type text,
  _entity_id uuid,
  _project_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_def_active boolean;
  v_first_sla integer;
  v_instance_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_active INTO v_def_active
    FROM public.workflow_definitions WHERE id = _definition_id;
  IF v_def_active IS NULL THEN
    RAISE EXCEPTION 'Workflow definition not found';
  END IF;
  IF NOT v_def_active THEN
    RAISE EXCEPTION 'Workflow definition is inactive';
  END IF;

  -- Permission: admin OR project owner
  IF NOT (public.has_role(v_user, 'admin')
          OR (_project_id IS NOT NULL AND public.user_owns_project(_project_id))) THEN
    RAISE EXCEPTION 'Not authorized to start workflow';
  END IF;

  -- First step's SLA → due_at
  SELECT sla_hours INTO v_first_sla
    FROM public.workflow_steps
   WHERE definition_id = _definition_id
   ORDER BY step_order ASC LIMIT 1;

  INSERT INTO public.workflow_instances
    (definition_id, entity_type, entity_id, project_id, started_by, status,
     current_step_order, due_at, metadata)
  VALUES
    (_definition_id, _entity_type, _entity_id, _project_id, v_user, 'in_progress',
     1,
     CASE WHEN v_first_sla IS NOT NULL THEN now() + make_interval(hours => v_first_sla) END,
     COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_instance_id;

  RETURN v_instance_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_workflow(uuid, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_workflow(uuid, text, uuid, uuid, jsonb) TO authenticated;

-- decide_workflow_step: approve or reject the current step
CREATE OR REPLACE FUNCTION public.decide_workflow_step(
  _instance_id uuid,
  _decision public.workflow_approval_decision,
  _comment text DEFAULT NULL
) RETURNS public.workflow_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_instance public.workflow_instances;
  v_step public.workflow_steps;
  v_next_step public.workflow_steps;
  v_can_approve boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_instance FROM public.workflow_instances WHERE id = _instance_id FOR UPDATE;
  IF v_instance.id IS NULL THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;
  IF v_instance.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'Workflow already %', v_instance.status;
  END IF;

  SELECT * INTO v_step
    FROM public.workflow_steps
   WHERE definition_id = v_instance.definition_id
     AND step_order = v_instance.current_step_order;
  IF v_step.id IS NULL THEN RAISE EXCEPTION 'Current step missing'; END IF;

  -- Authorization
  v_can_approve := public.has_role(v_user, 'admin')
    OR v_step.approver_user_id = v_user
    OR (v_step.approver_role IS NOT NULL AND public.has_role(v_user, v_step.approver_role));
  IF NOT v_can_approve THEN
    RAISE EXCEPTION 'Not authorized to decide this step';
  END IF;

  -- Log decision (immutable)
  INSERT INTO public.workflow_approvals
    (instance_id, step_id, step_order, approver_id, decision, comment)
  VALUES
    (_instance_id, v_step.id, v_step.step_order, v_user, _decision, _comment);

  -- Audit log
  INSERT INTO public.financial_audit_logs (user_id, action, entity_type, entity_id, after_state)
  VALUES (
    v_user,
    'workflow_' || _decision::text,
    v_instance.entity_type,
    v_instance.entity_id,
    jsonb_build_object(
      'instance_id', _instance_id,
      'step_order', v_step.step_order,
      'comment', _comment
    )
  );

  IF _decision = 'rejected' THEN
    UPDATE public.workflow_instances
       SET status = 'rejected', completed_at = now()
     WHERE id = _instance_id
     RETURNING * INTO v_instance;
    RETURN v_instance;
  END IF;

  -- Approved → move to next step or complete
  SELECT * INTO v_next_step
    FROM public.workflow_steps
   WHERE definition_id = v_instance.definition_id
     AND step_order > v_step.step_order
   ORDER BY step_order ASC LIMIT 1;

  IF v_next_step.id IS NULL THEN
    UPDATE public.workflow_instances
       SET status = 'approved', completed_at = now(), current_step_order = v_step.step_order
     WHERE id = _instance_id
     RETURNING * INTO v_instance;
  ELSE
    UPDATE public.workflow_instances
       SET current_step_order = v_next_step.step_order,
           status = 'in_progress',
           due_at = CASE WHEN v_next_step.sla_hours IS NOT NULL
                         THEN now() + make_interval(hours => v_next_step.sla_hours) END
     WHERE id = _instance_id
     RETURNING * INTO v_instance;
  END IF;

  RETURN v_instance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decide_workflow_step(uuid, public.workflow_approval_decision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_workflow_step(uuid, public.workflow_approval_decision, text) TO authenticated;

-- cancel_workflow
CREATE OR REPLACE FUNCTION public.cancel_workflow(_instance_id uuid, _reason text DEFAULT NULL)
RETURNS public.workflow_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_instance public.workflow_instances;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_instance FROM public.workflow_instances WHERE id = _instance_id FOR UPDATE;
  IF v_instance.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_instance.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'Already %', v_instance.status;
  END IF;
  IF NOT (public.has_role(v_user, 'admin') OR v_instance.started_by = v_user) THEN
    RAISE EXCEPTION 'Not authorized to cancel';
  END IF;

  UPDATE public.workflow_instances
     SET status = 'cancelled', completed_at = now(),
         metadata = metadata || jsonb_build_object('cancel_reason', _reason)
   WHERE id = _instance_id
   RETURNING * INTO v_instance;

  INSERT INTO public.financial_audit_logs (user_id, action, entity_type, entity_id, after_state)
  VALUES (v_user, 'workflow_cancelled', v_instance.entity_type, v_instance.entity_id,
          jsonb_build_object('instance_id', _instance_id, 'reason', _reason));

  RETURN v_instance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_workflow(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_workflow(uuid, text) TO authenticated;