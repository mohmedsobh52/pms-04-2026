CREATE OR REPLACE FUNCTION public.trg_claim_workflow_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_claim public.claims;
  v_new_status text;
BEGIN
  IF NEW.entity_type <> 'claim' THEN RETURN NEW; END IF;
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;

  SELECT * INTO v_claim FROM public.claims WHERE id = NEW.entity_id;
  IF v_claim.id IS NULL THEN RETURN NEW; END IF;

  v_new_status := CASE WHEN NEW.status = 'approved' THEN 'closed' ELSE 'rejected' END;

  IF v_claim.status <> v_new_status THEN
    UPDATE public.claims
       SET status = v_new_status,
           resolved_date = COALESCE(resolved_date, current_date),
           decided_at = COALESCE(decided_at, now()),
           decision_notes = COALESCE(decision_notes,
             'Auto-updated by approval workflow instance ' || NEW.id::text)
     WHERE id = v_claim.id;

    INSERT INTO public.claim_events (claim_id, user_id, event_type, from_status, to_status, body, metadata)
    VALUES (v_claim.id, COALESCE(NEW.started_by, v_claim.user_id), 'workflow_decision',
            v_claim.status, v_new_status,
            CASE WHEN NEW.status = 'approved'
                 THEN 'تم إغلاق المطالبة تلقائياً بعد إصدار الاعتماد'
                 ELSE 'تم رفض المطالبة عبر مسار الاعتماد' END,
            jsonb_build_object('instance_id', NEW.id));
  END IF;

  PERFORM public.notify_user(
    NEW.started_by,
    'claim.workflow_decision',
    CASE WHEN NEW.status = 'approved'
         THEN 'اعتماد المطالبة ' || v_claim.claim_number || ' — تم إغلاقها تلقائياً'
         ELSE 'رفض المطالبة ' || v_claim.claim_number END,
    v_claim.title,
    '/claims/' || v_claim.id::text,
    'claim', v_claim.id, v_claim.project_id,
    CASE WHEN NEW.status = 'approved' THEN 'info' ELSE 'warning' END,
    'claim_wf:' || NEW.id::text || ':' || NEW.status
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_claim_workflow_sync ON public.workflow_instances;
CREATE TRIGGER trg_claim_workflow_sync
AFTER UPDATE ON public.workflow_instances
FOR EACH ROW EXECUTE FUNCTION public.trg_claim_workflow_sync();