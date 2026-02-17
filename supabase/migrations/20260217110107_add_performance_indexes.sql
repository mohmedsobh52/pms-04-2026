/*
  # Add Performance Indexes

  1. Indexes Added
    - `saved_projects`:
      - Index on `user_id` and `created_at` for faster user queries
      - Index on `user_id` and `updated_at` for recent projects
      - Index on `status` for filtering
    - `price_quotations`:
      - Index on `project_id` for faster joins
      - Index on `user_id` and `status` for filtering
      - Index on `created_at` for sorting
    - `progress_certificates`:
      - Index on `project_id` for faster lookups
      - Index on `contract_id` for contract-related queries
      - Index on `user_id` and `status` for filtering
    - `contracts`:
      - Index on `project_id` for faster project lookups
      - Index on `user_id` and `status` for filtering
      - Index on `start_date` and `end_date` for date range queries
    - `risks`:
      - Index on `project_id` for faster project risk lookups
      - Index on `user_id` and `status` for active risk queries
      - Index on `risk_score` for priority sorting
    - `project_progress_history`:
      - Index on `project_id` and `record_date` for trending data
      - Index on `user_id` for user-specific history

  2. Benefits
    - Faster query execution on large datasets
    - Improved dashboard loading times
    - Better performance for filtered and sorted lists
    - Optimized join operations

  3. Notes
    - Uses `IF NOT EXISTS` to prevent duplicate index errors
    - Composite indexes for commonly combined filters
    - Covers most common query patterns in the application
*/

-- Saved Projects Indexes
CREATE INDEX IF NOT EXISTS idx_saved_projects_user_created 
  ON saved_projects(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_projects_user_updated 
  ON saved_projects(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_projects_status 
  ON saved_projects(status) WHERE status IS NOT NULL;

-- Price Quotations Indexes
CREATE INDEX IF NOT EXISTS idx_price_quotations_project 
  ON price_quotations(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_price_quotations_user_status 
  ON price_quotations(user_id, status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_price_quotations_created 
  ON price_quotations(created_at DESC);

-- Progress Certificates Indexes
CREATE INDEX IF NOT EXISTS idx_progress_certificates_project 
  ON progress_certificates(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_progress_certificates_contract 
  ON progress_certificates(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_progress_certificates_user_status 
  ON progress_certificates(user_id, status) WHERE status IS NOT NULL;

-- Contracts Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_project 
  ON contracts(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_user_status 
  ON contracts(user_id, status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_dates 
  ON contracts(start_date, end_date);

-- Risks Indexes
CREATE INDEX IF NOT EXISTS idx_risks_project 
  ON risks(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_user_status 
  ON risks(user_id, status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_score 
  ON risks(risk_score DESC) WHERE risk_score IS NOT NULL;

-- Project Progress History Indexes
CREATE INDEX IF NOT EXISTS idx_progress_history_project_date 
  ON project_progress_history(project_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_progress_history_user 
  ON project_progress_history(user_id);

-- Analysis Jobs Indexes (for better job queue performance)
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status 
  ON analysis_jobs(user_id, status) WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created 
  ON analysis_jobs(created_at DESC);
