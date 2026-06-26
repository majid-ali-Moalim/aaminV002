-- CreateTable
CREATE TABLE IF NOT EXISTS "work_shifts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT,
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 15,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "work_shifts_code_key" ON "work_shifts"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "work_shifts_name_key" ON "work_shifts"("name");

INSERT INTO "work_shifts" ("id", "code", "name", "startTime", "endTime", "description", "gracePeriodMins", "breakMinutes", "color", "isActive", "updatedAt")
SELECT 'shift-morning', 'MORNING', 'Morning Shift', '06:00', '14:00', 'Day shift coverage', 15, 30, '#22C55E', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "work_shifts" WHERE "code" = 'MORNING');

INSERT INTO "work_shifts" ("id", "code", "name", "startTime", "endTime", "description", "gracePeriodMins", "breakMinutes", "color", "isActive", "updatedAt")
SELECT 'shift-evening', 'EVENING', 'Evening Shift', '14:00', '22:00', 'Afternoon and evening coverage', 15, 30, '#3B82F6', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "work_shifts" WHERE "code" = 'EVENING');

INSERT INTO "work_shifts" ("id", "code", "name", "startTime", "endTime", "description", "gracePeriodMins", "breakMinutes", "color", "isActive", "updatedAt")
SELECT 'shift-night', 'NIGHT', 'Night Shift', '22:00', '06:00', 'Overnight coverage', 15, 30, '#6366F1', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "work_shifts" WHERE "code" = 'NIGHT');
