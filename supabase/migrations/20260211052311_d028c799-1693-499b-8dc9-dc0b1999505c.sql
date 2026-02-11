
ALTER TABLE progress_certificates 
  DROP CONSTRAINT IF EXISTS progress_certificates_project_id_fkey;

ALTER TABLE progress_certificates 
  ADD CONSTRAINT progress_certificates_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES project_data(id);
