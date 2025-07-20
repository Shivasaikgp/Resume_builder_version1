-- CreateTable
CREATE TABLE "AIFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "finalContent" TEXT,
    "context" TEXT NOT NULL,
    "section" TEXT,
    "userContext" JSONB DEFAULT '{}',
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIFeedback_userId_idx" ON "AIFeedback"("userId");
CREATE INDEX "AIFeedback_sessionId_idx" ON "AIFeedback"("sessionId");
CREATE INDEX "AIFeedback_timestamp_idx" ON "AIFeedback"("timestamp");
CREATE INDEX "AIFeedback_action_idx" ON "AIFeedback"("action");
CREATE INDEX "AIFeedback_section_idx" ON "AIFeedback"("section");

-- Add foreign key constraint
ALTER TABLE "AIFeedback" ADD CONSTRAINT "AIFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;