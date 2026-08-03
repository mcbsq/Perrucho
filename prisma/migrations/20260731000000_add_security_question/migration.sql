-- Additive-only migration (no drops) — safe to run against the shared
-- production database while the deployed site still uses the old schema.
ALTER TABLE "User" ADD COLUMN "securityQuestion" TEXT;
ALTER TABLE "User" ADD COLUMN "securityAnswerHash" TEXT;
