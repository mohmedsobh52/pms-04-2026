CREATE OR REPLACE FUNCTION public.notify_overdue_claims()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_days integer;
BEGIN
  FOR r IN
    SELECT * FROM public.claims
     WHERE response_due_date IS NOT NULL
       AND response_due_date < current_date
       AND status NOT IN ('approved','partially_approved','rejected','closed')
  LOOP
    v_days := (current_date - r.response_due_date);

    PERFORM public.notify_user(
      r.user_id, 'claim.overdue',
      'مطالبة متأخرة: ' || COALESCE(r.claim_number, ''),
      COALESCE(r.title, '') || ' — تجاوزت موعد الرد بـ ' || v_days || ' يوم',
      '/claims/' || r.id::text,
      'claim', r.id, r.project_id, 'warning',
      'claim_overdue:' || r.id::text || ':' || current_date::text
    );

    IF r.assigned_to IS NOT NULL AND r.assigned_to <> r.user_id THEN
      PERFORM public.notify_user(
        r.assigned_to, 'claim.overdue',
        'مطالبة متأخرة: ' || COALESCE(r.claim_number, ''),
        COALESCE(r.title, '') || ' — تجاوزت موعد الرد بـ ' || v_days || ' يوم',
        '/claims/' || r.id::text,
        'claim', r.id, r.project_id, 'warning',
        'claim_overdue_a:' || r.id::text || ':' || current_date::text
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'notify-overdue-claims-daily',
  '0 6 * * *',
  $$SELECT public.notify_overdue_claims();$$
);