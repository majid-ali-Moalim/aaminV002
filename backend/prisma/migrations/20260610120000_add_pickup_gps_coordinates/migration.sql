-- AlterTable
ALTER TABLE "emergency_requests" ADD COLUMN IF NOT EXISTS "pickupLatitude" DOUBLE PRECISION;
ALTER TABLE "emergency_requests" ADD COLUMN IF NOT EXISTS "pickupLongitude" DOUBLE PRECISION;
