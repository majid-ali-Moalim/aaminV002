-- One driver/nurse/ambulance per in-progress case (database-enforced).
CREATE UNIQUE INDEX IF NOT EXISTS "emergency_requests_active_driver_unique"
  ON "emergency_requests" ("driverId")
  WHERE "status" IN (
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'PATIENT_STABILIZED',
    'TRANSPORTING',
    'ARRIVED_HOSPITAL'
  )
  AND "driverId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "emergency_requests_active_nurse_unique"
  ON "emergency_requests" ("nurseId")
  WHERE "status" IN (
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'PATIENT_STABILIZED',
    'TRANSPORTING',
    'ARRIVED_HOSPITAL'
  )
  AND "nurseId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "emergency_requests_active_ambulance_unique"
  ON "emergency_requests" ("ambulanceId")
  WHERE "status" IN (
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'PATIENT_STABILIZED',
    'TRANSPORTING',
    'ARRIVED_HOSPITAL'
  )
  AND "ambulanceId" IS NOT NULL;
