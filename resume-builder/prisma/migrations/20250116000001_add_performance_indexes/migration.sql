-- Add performance indexes for optimized queries

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_email_created" ON "users" ("email", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_updated_at" ON "users" ("updated_at");

-- Resume table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_user_updated" ON "resumes" ("user_id", "updated_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_user_created" ON "resumes" ("user_id", "created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_title_search" ON "resumes" USING gin(to_tsvector('english', "title"));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_data_search" ON "resumes" USING gin("data");

-- Resume Analysis table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resume_analyses_resume_created" ON "resume_analyses" ("resume_id", "created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resume_analyses_score" ON "resume_analyses" ("score");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resume_analyses_created_at" ON "resume_analyses" ("created_at" DESC);

-- User Context table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_contexts_updated" ON "user_contexts" ("updated_at" DESC);

-- AI Feedback table indexes (already exist in schema but ensuring they're optimal)
-- These are already defined in the schema, but we can add composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_feedback_user_type_created" ON "ai_feedback" ("user_id", "type", "created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_feedback_rating_created" ON "ai_feedback" ("rating", "created_at" DESC);

-- Error Log table indexes (already exist in schema but ensuring they're optimal)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_error_logs_user_type_created" ON "error_logs" ("user_id", "error_type", "created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_error_logs_resolved_created" ON "error_logs" ("resolved", "created_at" DESC);

-- Session table indexes for better auth performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_user_expires" ON "sessions" ("user_id", "expires");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_expires" ON "sessions" ("expires");

-- Account table indexes for auth optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_accounts_user_provider" ON "accounts" ("user_id", "provider");

-- Partial indexes for active/recent data
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_recent_active" ON "resumes" ("user_id", "updated_at" DESC) 
WHERE "updated_at" > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_analyses_recent" ON "resume_analyses" ("resume_id", "created_at" DESC)
WHERE "created_at" > NOW() - INTERVAL '7 days';

-- Functional indexes for JSON data queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_resumes_personal_info" ON "resumes" 
USING gin((("data"->>'personalInfo')::jsonb));

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_contexts_profile" ON "user_contexts" 
USING gin((("context_data"->>'profile')::jsonb));

-- Statistics update for better query planning
ANALYZE "users";
ANALYZE "resumes";
ANALYZE "resume_analyses";
ANALYZE "user_contexts";
ANALYZE "ai_feedback";
ANALYZE "error_logs";
ANALYZE "sessions";
ANALYZE "accounts";