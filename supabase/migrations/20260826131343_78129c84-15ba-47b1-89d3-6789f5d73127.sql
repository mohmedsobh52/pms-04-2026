CREATE OR REPLACE FUNCTION public.enforce_record_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF public.is_record_locked(TG_ARGV[0], OLD.id) THEN
    RAISE EXCEPTION 'Record % is locked and cannot be modified', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;