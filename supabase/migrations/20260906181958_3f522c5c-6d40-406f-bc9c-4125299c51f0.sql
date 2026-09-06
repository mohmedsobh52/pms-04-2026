-- 1) Scheduled report delivery options
ALTER TABLE public.scheduled_reports
  ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS file_format text NOT NULL DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS last_run_status text;

-- 2) Project baselines
CREATE TABLE IF NOT EXISTS public.project_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  notes text,
  is_current boolean NOT NULL DEFAULT true,
  total_value numeric NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_baselines TO authenticated;
GRANT ALL ON public.project_baselines TO service_role;

ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their project baselines" ON public.project_baselines;
CREATE POLICY "Owners manage their project baselines"
ON public.project_baselines FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.user_owns_project(project_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_project_baselines_project ON public.project_baselines(project_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_project_baselines_updated_at ON public.project_baselines;
CREATE TRIGGER trg_project_baselines_updated_at
BEFORE UPDATE ON public.project_baselines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Claim status transition -> history event + notifications
CREATE OR REPLACE FUNCTION public.trg_claim_status_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NEW.user_id);
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.claim_events (claim_id, user_id, event_type, from_status, to_status, body, metadata)
  VALUES (NEW.id, v_actor, 'status_change', OLD.status, NEW.status,
          'تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status,
          jsonb_build_object('source', 'trigger'));

  PERFORM public.notify_user(
    NEW.user_id, 'claim.status_change',
    'تحديث حالة المطالبة ' || NEW.claim_number,
    NEW.title || ' — ' || OLD.status || ' → ' || NEW.status,
    '/claims/' || NEW.id::text,
    'claim', NEW.id, NEW.project_id,
    CASE WHEN NEW.status IN ('rejected') THEN 'warning' ELSE 'info' END,
    'claim_status:' || NEW.id::text || ':' || NEW.status || ':' || extract(epoch from now())::bigint::text
  );

  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.user_id THEN
    PERFORM public.notify_user(
      NEW.assigned_to, 'claim.status_change',
      'تحديث حالة المطالبة ' || NEW.claim_number,
      NEW.title || ' — ' || OLD.status || ' → ' || NEW.status,
      '/claims/' || NEW.id::text,
      'claim', NEW.id, NEW.project_id, 'info',
      'claim_status_a:' || NEW.id::text || ':' || NEW.status || ':' || extract(epoch from now())::bigint::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_status_notify ON public.claims;
CREATE TRIGGER trg_claim_status_notify
AFTER UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.trg_claim_status_notify();

-- 4) Workflow transitions -> notify requester + next approver
CREATE OR REPLACE FUNCTION public.trg_workflow_transition_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_step public.workflow_steps;
  v_title text;
  v_status text := NEW.status::text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.current_step_order IS NOT DISTINCT FROM OLD.current_step_order THEN
    RETURN NEW;
  END IF;

  v_title := CASE v_status
    WHEN 'pending' THEN 'بدء مسار اعتماد'
    WHEN 'in_progress' THEN 'انتقال مسار الاعتماد إلى الخطوة ' || COALESCE(NEW.current_step_order, 1)::text
    WHEN 'approved' THEN 'اكتمال الاعتماد'
    WHEN 'rejected' THEN 'رفض في مسار الاعتماد'
    WHEN 'cancelled' THEN 'إلغاء مسار الاعتماد'
    ELSE 'تحديث مسار الاعتماد' END;

  PERFORM public.notify_user(
    NEW.started_by, 'workflow.transition', v_title,
    NEW.entity_type || ' — ' || v_status,
    '/approvals',
    NEW.entity_type, NEW.entity_id, NEW.project_id,
    CASE WHEN v_status = 'rejected' THEN 'warning' ELSE 'info' END,
    'wf_tr:' || NEW.id::text || ':' || v_status || ':' || COALESCE(NEW.current_step_order, 0)::text
  );

  IF v_status IN ('pending', 'in_progress') THEN
    SELECT * INTO v_step FROM public.workflow_steps
     WHERE definition_id = NEW.definition_id AND step_order = NEW.current_step_order;

    IF v_step.approver_user_id IS NOT NULL AND v_step.approver_user_id <> NEW.started_by THEN
      PERFORM public.notify_user(
        v_step.approver_user_id, 'workflow.action_required',
        'مطلوب اعتمادك: ' || COALESCE(v_step.name, 'خطوة ' || v_step.step_order::text),
        NEW.entity_type,
        '/approvals',
        NEW.entity_type, NEW.entity_id, NEW.project_id, 'warning',
        'wf_req:' || NEW.id::text || ':' || COALESCE(NEW.current_step_order, 0)::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_transition_notify ON public.workflow_instances;
CREATE TRIGGER trg_workflow_transition_notify
AFTER INSERT OR UPDATE ON public.workflow_instances
FOR EACH ROW EXECUTE FUNCTION public.trg_workflow_transition_notify();