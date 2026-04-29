CREATE OR REPLACE FUNCTION public.save_project_with_items(
  _project_id uuid,
  _name text,
  _file_name text,
  _analysis_data jsonb,
  _wbs_data jsonb,
  _total_value numeric,
  _currency text,
  _items jsonb,
  _costs jsonb,
  _overwrite boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_item jsonb;
  v_inserted_id uuid;
  v_cost jsonb;
  v_idx int := 0;
  v_inserted_ids uuid[] := ARRAY[]::uuid[];
  v_item_numbers text[] := ARRAY[]::text[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _overwrite AND _project_id IS NOT NULL THEN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM saved_projects WHERE id = _project_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Project not found or access denied';
    END IF;

    v_project_id := _project_id;

    -- Clear children first
    DELETE FROM item_costs WHERE project_item_id IN (SELECT id FROM project_items WHERE project_id = v_project_id);
    DELETE FROM project_items WHERE project_id = v_project_id;

    UPDATE saved_projects SET
      name = _name,
      file_name = _file_name,
      analysis_data = _analysis_data,
      wbs_data = _wbs_data,
      updated_at = now()
    WHERE id = v_project_id;

    UPDATE project_data SET
      name = _name,
      file_name = _file_name,
      analysis_data = _analysis_data,
      wbs_data = _wbs_data,
      total_value = _total_value,
      currency = _currency,
      items_count = jsonb_array_length(_items),
      updated_at = now()
    WHERE id = v_project_id;

    -- If project_data row missing, insert it
    IF NOT FOUND THEN
      INSERT INTO project_data (id, user_id, name, file_name, analysis_data, wbs_data, total_value, currency, items_count)
      VALUES (v_project_id, v_user_id, _name, _file_name, _analysis_data, _wbs_data, _total_value, _currency, jsonb_array_length(_items));
    END IF;
  ELSE
    INSERT INTO saved_projects (user_id, name, file_name, analysis_data, wbs_data)
    VALUES (v_user_id, _name, _file_name, _analysis_data, _wbs_data)
    RETURNING id INTO v_project_id;

    INSERT INTO project_data (id, user_id, name, file_name, analysis_data, wbs_data, total_value, currency, items_count)
    VALUES (v_project_id, v_user_id, _name, _file_name, _analysis_data, _wbs_data, _total_value, _currency, jsonb_array_length(_items));
  END IF;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO project_items (
      project_id, item_number, description, unit, quantity, unit_price, total_price, category, notes, sort_order
    ) VALUES (
      v_project_id,
      v_item->>'item_number',
      v_item->>'description',
      v_item->>'unit',
      NULLIF(v_item->>'quantity','')::numeric,
      NULLIF(v_item->>'unit_price','')::numeric,
      NULLIF(v_item->>'total_price','')::numeric,
      v_item->>'category',
      v_item->>'notes',
      v_idx
    )
    RETURNING id INTO v_inserted_id;

    v_inserted_ids := array_append(v_inserted_ids, v_inserted_id);
    v_item_numbers := array_append(v_item_numbers, v_item->>'item_number');
    v_idx := v_idx + 1;
  END LOOP;

  -- Insert costs (matched by item_number)
  IF jsonb_array_length(_costs) > 0 THEN
    FOR v_cost IN SELECT * FROM jsonb_array_elements(_costs)
    LOOP
      DECLARE
        v_pos int;
      BEGIN
        SELECT i FROM generate_subscripts(v_item_numbers, 1) AS i
          WHERE v_item_numbers[i] = (v_cost->>'item_number') LIMIT 1 INTO v_pos;
        IF v_pos IS NOT NULL THEN
          INSERT INTO item_costs (
            project_item_id, general_labor, equipment_operator, overhead, admin, insurance,
            contingency, profit_margin, materials, equipment, subcontractor, ai_suggested_rate, calculated_unit_price
          ) VALUES (
            v_inserted_ids[v_pos],
            COALESCE((v_cost->>'general_labor')::numeric, 0),
            COALESCE((v_cost->>'equipment_operator')::numeric, 0),
            COALESCE((v_cost->>'overhead')::numeric, 0),
            COALESCE((v_cost->>'admin')::numeric, 0),
            COALESCE((v_cost->>'insurance')::numeric, 0),
            COALESCE((v_cost->>'contingency')::numeric, 0),
            COALESCE((v_cost->>'profit_margin')::numeric, 10),
            COALESCE((v_cost->>'materials')::numeric, 0),
            COALESCE((v_cost->>'equipment')::numeric, 0),
            COALESCE((v_cost->>'subcontractor')::numeric, 0),
            NULLIF(v_cost->>'ai_suggested_rate','')::numeric,
            COALESCE((v_cost->>'calculated_unit_price')::numeric, 0)
          );
        END IF;
      END;
    END LOOP;
  END IF;

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) TO authenticated;