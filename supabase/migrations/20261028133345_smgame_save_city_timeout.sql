CREATE OR REPLACE FUNCTION public.smgame_save_city(p_slot_id text, p_name text, p_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '60s'
AS $function$
DECLARE
  owner_id uuid := auth.uid();
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.smgame_saves(user_id, slot_id, name, data, updated_at)
  VALUES (owner_id, p_slot_id, p_name, p_data, now())
  ON CONFLICT (user_id, slot_id) DO UPDATE
    SET name = EXCLUDED.name, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
  RETURN p_slot_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.smgame_save_city(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smgame_save_city(text, text, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';