-- AlterTable
ALTER TABLE "user_permissions" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "user_permissions_isActive_idx" ON "user_permissions"("isActive");
