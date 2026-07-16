CREATE TABLE "AdminAuditLog" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "userEmail" TEXT,
  "userRole" "UserRole",
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "entityTitle" TEXT,
  "method" TEXT,
  "path" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_entityType_idx" ON "AdminAuditLog"("entityType");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
