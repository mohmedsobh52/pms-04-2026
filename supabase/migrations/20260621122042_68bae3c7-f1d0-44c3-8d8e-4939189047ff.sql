
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  related_entity_type text,
  related_entity_id uuid,
  project_id uuid,
  dedup_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "Authenticated users insert own"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread
  ON public.notifications(recipient_id, read_at, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedup
  ON public.notifications(recipient_id, dedup_key) WHERE dedup_key IS NOT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[])
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH upd AS (
    UPDATE public.notifications SET read_at = now()
     WHERE recipient_id = auth.uid() AND id = ANY(_ids) AND read_at IS NULL
     RETURNING 1
  ) SELECT count(*)::int FROM upd;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH upd AS (
    UPDATE public.notifications SET read_at = now()
     WHERE recipient_id = auth.uid() AND read_at IS NULL
     RETURNING 1
  ) SELECT count(*)::int FROM upd;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_user(
  _recipient uuid, _type text, _title text,
  _body text DEFAULT NULL, _link text DEFAULT NULL,
  _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL, _severity text DEFAULT 'info',
  _dedup_key text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _recipient IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications
    (recipient_id, type, severity, title, body, link,
     related_entity_type, related_entity_id, project_id, dedup_key)
  VALUES
    (_recipient, _type, _severity, _title, _body, _link,
     _entity_type, _entity_id, _project_id, _dedup_key)
  ON CONFLICT (recipient_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text,text,uuid,uuid,text,text) FROM PUBLIC, anon;

-- Risks: notify when risk_score ≥ 15 (5x5 matrix high+)
CREATE OR REPLACE FUNCTION public.trg_notify_high_risk()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_score numeric;
BEGIN
  v_score := COALESCE(NEW.risk_score, 0);
  IF v_score < 15 THEN RETURN NEW; END IF;
  SELECT user_id INTO v_owner FROM public.project_data WHERE id = NEW.project_id;
  IF v_owner IS NULL THEN v_owner := NEW.user_id; END IF;
  IF v_owner IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_user(
    v_owner, 'risk.high', 'High risk: ' || COALESCE(NEW.risk_title, ''),
    NEW.risk_description, '/risks',
    'risk', NEW.id, NEW.project_id,
    CASE WHEN v_score >= 20 THEN 'critical' ELSE 'warning' END,
    'risk:' || NEW.id::text || ':' || v_score::text
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_high_risk ON public.risks;
CREATE TRIGGER trg_notify_high_risk
  AFTER INSERT OR UPDATE OF risk_score ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_high_risk();

-- Contracts expiring soon
CREATE OR REPLACE FUNCTION public.trg_notify_contract_expiring()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_days integer;
BEGIN
  IF NEW.end_date IS NULL THEN RETURN NEW; END IF;
  v_days := (NEW.end_date - current_date);
  IF v_days < 0 OR v_days > 30 THEN RETURN NEW; END IF;
  SELECT user_id INTO v_owner FROM public.project_data WHERE id = NEW.project_id;
  IF v_owner IS NULL THEN v_owner := NEW.user_id; END IF;
  IF v_owner IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_user(
    v_owner, 'contract.expiring',
    'Contract expiring in ' || v_days || 'd: ' || COALESCE(NEW.contract_number, NEW.contract_title, ''),
    'End date: ' || NEW.end_date::text, '/contracts',
    'contract', NEW.id, NEW.project_id,
    CASE WHEN v_days <= 7 THEN 'critical' ELSE 'warning' END,
    'contract_exp:' || NEW.id::text || ':' || NEW.end_date::text
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_contract_expiring ON public.contracts;
CREATE TRIGGER trg_notify_contract_expiring
  AFTER INSERT OR UPDATE OF end_date ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_contract_expiring();

-- New progress certificate
CREATE OR REPLACE FUNCTION public.trg_notify_new_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.project_data WHERE id = NEW.project_id;
  IF v_owner IS NULL THEN v_owner := NEW.user_id; END IF;
  IF v_owner IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_user(
    v_owner, 'certificate.created',
    'New progress certificate #' || COALESCE(NEW.certificate_number::text, ''),
    NULL, '/certificates',
    'progress_certificate', NEW.id, NEW.project_id,
    'info', 'cert_created:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_new_certificate ON public.progress_certificates;
CREATE TRIGGER trg_notify_new_certificate
  AFTER INSERT ON public.progress_certificates
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_certificate();
