-- Hospital portal: staff linkage, extended hospital fields, user auth hardening
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "hospitalId" TEXT;
CREATE INDEX IF NOT EXISTS "employees_hospitalId_idx" ON "employees"("hospitalId");
ALTER TABLE "employees" ADD CONSTRAINT "employees_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "operatingRooms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "ambulanceReceptionCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "available24_7" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "acceptAmbulanceTransfers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "acceptWalkInPatients" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "capacityStatus" TEXT NOT NULL DEFAULT 'Available';
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "emergencyShortCode" TEXT;
