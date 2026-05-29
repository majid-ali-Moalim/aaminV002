# Aamin Ambulance Emergency Dispatch System (EADS)

> **Purpose of this document:** Give Cursor AI (and developers) complete project context — system purpose, roles, database, frontend/backend structure, workflows, naming conventions, UI direction, and what is already built vs. planned.

---

## Project Overview

**Aamin Ambulance Emergency Dispatch System (EADS)** is a full-stack web-based ambulance management and emergency response platform for **Aamin Ambulance**, a non-profit organization in Somalia.

The system manages:

- Emergency ambulance requests
- Manual dispatch operations
- Patient records and case handling
- Staff management (drivers, nurses, dispatchers)
- Hospital referrals
- Emergency case monitoring
- Reporting and analytics
- Role-based dashboard access

### Critical design principle

This is **NOT** a taxi-style GPS ambulance system.

- Dispatch is **manual** and controlled by dispatchers/admins.
- There is **no live GPS vehicle tracking** requirement today.
- Public "tracking" means **case status tracking** by tracking code or phone — not a moving map.

---

## Main Goal

> Allow patients or the public to request an ambulance quickly, while enabling dispatchers, drivers, nurses, and administrators to manage emergency operations efficiently.

---

## Repository Layout

```
Aamin01/
├── frontend/          # Next.js 14 App Router (port 3000)
├── backend/           # NestJS REST API (port 3001, prefix /api)
├── README.md          # Setup & high-level docs
└── PROJECT_CONTEXT.md # This file — AI/project context
```

---

## System Architecture

### Frontend

| Technology | Usage |
|---|---|
| Next.js 14 | App Router, server/client components |
| TypeScript | All application code |
| Tailwind CSS | Styling + design tokens in `globals.css` |
| shadcn/ui | Base UI (`components/ui/`) |
| Axios | HTTP client (`lib/api.ts`, `lib/driverApi.ts`) |
| React Hook Form + Zod | Forms and validation |
| TanStack Table | Admin data tables |
| Recharts | Dashboard charts |
| Zustand | Driver app state (`lib/stores/driverStore.ts`) |
| Socket.io Client | Real-time driver/tracking updates |
| SWR | Data fetching where used |
| Lucide React | Icons throughout admin & driver UI |

**Frontend entry points:**

- `frontend/src/app/` — routes
- `frontend/src/components/` — reusable UI
- `frontend/src/context/AuthContext.tsx` — auth session
- `frontend/src/lib/api.ts` — main API service
- `frontend/src/types/index.ts` — shared TypeScript types/enums
- `frontend/src/middleware.ts` — route protection (JWT decode, role redirects)

### Backend

| Technology | Usage |
|---|---|
| NestJS 10 | Modular REST API |
| Prisma ORM | PostgreSQL access |
| PostgreSQL | Primary database (`Aamin01`) |
| JWT + Passport | Authentication |
| Socket.io (NestJS WebSockets) | Real-time tracking & driver events |
| Swagger | API docs at `/api/docs` |
| bcrypt | Password hashing |
| class-validator | DTO validation |

**Backend entry points:**

- `backend/src/app.module.ts` — root module imports
- `backend/prisma/schema.prisma` — database schema
- `backend/src/main.ts` — bootstrap, CORS, `/api` prefix

### Database

- **Engine:** PostgreSQL
- **ORM:** Prisma (`backend/prisma/schema.prisma`)
- **Seed:** `backend/prisma/seed.ts` (regions, departments, roles, admin user, sample ambulances)
- **Migrations:** `backend/prisma/migrations/`

---

## User Roles

### Conceptual roles (product design)

| Role | Purpose |
|---|---|
| **Public User** | Browse site, request ambulance, track case |
| **Admin** | Full system access |
| **Dispatcher** | Emergency queue, verify, prioritize, assign resources |
| **Driver** | Accept missions, update trip status |
| **Nurse** | Patient care notes, medical status, handover |
| **Hospital** | Accept/reject referrals, confirm arrival |
| **Patient** | Registered patient account (optional) |

### Actual implementation (important)

**Prisma `User.role` enum** currently has only:

```
ADMIN | EMPLOYEE | PATIENT
```

Staff job functions (Dispatcher, Driver, Nurse) are modeled via:

- `Employee` record linked to `User`
- `EmployeeRole` master data (`Dispatcher`, `Driver`, `Nurse`, `Administrator`)
- `employee.employeeRoleId` → `EmployeeRole.name`

**Auth & routing behavior:**

- Login returns `User.role` from the database (usually `ADMIN` or `EMPLOYEE`).
- Frontend `AuthContext` redirects `EMPLOYEE` users by checking `employee.employeeRole.name`.
- Middleware and some API `@Roles()` decorators reference conceptual roles like `DISPATCHER`, `DRIVER` — these may not match JWT `role` until role mapping is unified.
- Hardcoded admin fallback exists: `aamin@admin` / `123321@admin`.

**Default admin (seeded):** see `backend/prisma/seed.ts`.

---

## Core System Modules

### Backend modules (implemented)

| Module | Path | Responsibility |
|---|---|---|
| `auth` | `backend/src/auth/` | Login, JWT, refresh token, guards |
| `employees` | `backend/src/employees/` | Staff CRUD, uploads |
| `drivers` | `backend/src/drivers/` | Driver-specific queries/filters |
| `nurses` | `backend/src/nurses/` | Nurse-specific operations |
| `patients` | `backend/src/patients/` | Patient records |
| `ambulances` | `backend/src/ambulances/` | Fleet management, crew assignment |
| `emergency-requests` | `backend/src/emergency-requests/` | **Core dispatch lifecycle** |
| `referrals` | `backend/src/referrals/` | Hospital referral workflow |
| `hospitals` | `backend/src/hospitals/` | Hospital registry & coordination |
| `notifications` | `backend/src/notifications/` | System alerts |
| `reports` | `backend/src/reports/` | Analytics endpoints |
| `system-setup` | `backend/src/system-setup/` | Regions, districts, areas, stations, master data |
| `tracking` | `backend/src/tracking/` | Public tracking API, WebSocket gateway, ETA, audit logs |
| `drivers-app` | `backend/src/drivers-app/` | Driver mobile portal API (profile, shift, missions) |
| `users` | `backend/src/users/` | User management |
| `prisma` | `backend/src/prisma/` | Prisma service |

There is **no separate `dispatchers` NestJS module** — dispatcher workflows live under admin UI + `emergency-requests`.

---

## Database Structure

### Geographic & organizational master data

- `Region` → `District` → `Area`
- `Station` (ambulance bases, linked to region/district)
- `Department`, `EmployeeRole`, `EquipmentLevel`, `IncidentCategory`

### Core entities

| Model | Key fields / notes |
|---|---|
| `User` | Auth account; `role`: ADMIN \| EMPLOYEE \| PATIENT |
| `Employee` | Staff profile; `employeeCode`, license, shift, station, assigned ambulance |
| `Patient` | `patientCode`, demographics, medical info, region/district |
| `Ambulance` | `ambulanceNumber`, plate, status, fuel, mileage, station, equipment |
| `EmergencyRequest` | **Central case record** — tracking code, status, priority, assignments |
| `EmergencyStatusLog` | Audit trail of status transitions |
| `Referral` | Hospital referral linked 1:1 to emergency request |
| `Hospital` | Hospital registry with ER readiness, beds, region |
| `Notification` | Typed alerts with priority and target role |
| `ActivityLog` | User action audit |
| `ShiftRecord` / `AttendanceRecord` | Staff shift & attendance |
| `PatientCareRecord` | Nurse vitals & clinical notes per case |
| `IncidentReport` | Nurse incident reporting per case |

### ID & code conventions (as implemented)

| Entity | Format | Example |
|---|---|---|
| Ambulance | `AMB-###` | `AMB-001`, `AMB-701` |
| Employee (driver) | `employeeCode` (varies) | `DRV-001` in test scripts |
| Patient | `PAT-####-XXXX` | Auto-generated on create |
| Emergency case | `CASE-YYYY-####` | `CASE-2026-0001` |
| Internal IDs | Prisma `cuid()` | Used for all FK relations |

> Original design docs mention `DR-001`, `NR-001`, `DSP-001`, `ER-001`. The codebase uses `employeeCode` (flexible string) and `CASE-YYYY-####` tracking codes rather than strict `ER-###` IDs.

### Key relations

```
Patient ──< EmergencyRequest >── Ambulance
                │
                ├── dispatcher (Employee)
                ├── driver (Employee)
                ├── nurse (Employee)
                ├── destinationHospital (Hospital)
                ├── statusLogs (EmergencyStatusLog[])
                ├── referrals (Referral?)
                └── patientCareRecords / incidentReport

Employee ── assignedAmbulance ──> Ambulance
Employee ── employeeRole ──> EmployeeRole (Dispatcher/Driver/Nurse)
```

### Enums (actual Prisma values)

**AmbulanceStatus:** `AVAILABLE | ON_DUTY | MAINTENANCE | UNAVAILABLE`

**EmergencyRequestStatus (database — authoritative):**

```
PENDING → REVIEWING → ASSIGNED → DISPATCHED → EN_ROUTE → ARRIVED_SCENE
→ PATIENT_STABILIZED → TRANSPORTING → ARRIVED_HOSPITAL → COMPLETED | CANCELLED
```

**Priority:** `LOW | MEDIUM | HIGH | CRITICAL`

**ReferralStatus:** `PENDING | ACCEPTED | REJECTED | COMPLETED`

**RequestSource:** `PHONE_CALL | WALK_IN | STAFF | REFERRAL | OTHER`

> Frontend `types/index.ts` EmergencyRequestStatus enum is **slightly out of sync** with Prisma (missing `REVIEWING`, `EN_ROUTE`, `PATIENT_STABILIZED`). Always treat `schema.prisma` as source of truth.

---

## Emergency Request Workflow (Manual Dispatch)

This is the **most important business flow**.

```
1. Public or staff submits request
      ↓
2. Request enters queue (PENDING / REVIEWING)
      ↓
3. Dispatcher/admin reviews & sets priority
      ↓
4. Dispatcher manually assigns ambulance + driver (+ nurse)
      ↓
5. Driver accepts / starts trip (status updates)
      ↓
6. Arrive at scene → patient stabilized/loaded
      ↓
7. Transport to hospital
      ↓
8. Hospital referral created / updated
      ↓
9. Patient delivered → case COMPLETED
```

**Implemented backend actions** (`emergency-requests.service.ts`):

- Create request (public endpoint, inline patient creation supported)
- Assign ambulance + driver + nurse + dispatcher
- Update status (with `EmergencyStatusLog` + notifications)
- Cancel / fail / escalate priority
- Track by `trackingCode`
- Emit WebSocket tracking updates via `TrackingGateway`

**Timestamps tracked on case:** `assignedAt`, `dispatchedAt`, `arrivedAtSceneAt`, `departedSceneAt`, `arrivedDestinationAt`, `completedAt`, `cancelledAt`, plus `responseMinutes` / `serviceMinutes`.

---

## Frontend Structure

### Public website (`frontend/src/app/(public)/` and root)

| Route | Page | Status |
|---|---|---|
| `/` | Home (hero, CTA, services) | Implemented |
| `/about` | About organization | Implemented |
| `/contact` | Contact info & form | Implemented |
| `/services` | Services overview | Implemented |
| `/hire-ambulance` | Public request / hire form | Implemented |
| `/ambulance-tracking` | Track by code or phone | Implemented |
| `/track`, `/track/[query]` | Alternate tracking routes | Implemented |

### Admin dashboard (`frontend/src/app/admin/`)

Primary operational console. Uses:

- `AdminSidebar.tsx` — full navigation tree (13 sections)
- `AdminTopBar.tsx`, `Breadcrumbs.tsx`
- `AdminStubPage.tsx` — placeholder for pages not yet built

**Admin sidebar sections (from `AdminSidebar.tsx`):**

1. **Dashboard** — overview, live ops, KPI, alerts, recent activity
2. **Emergency Operations** — all cases, new, pending, triage, assignment board, active, critical, escalated, completed, cancelled, timeline
3. **Patients & Case Records** — patients, medical notes, history
4. **Dispatch Resources** — ambulance/driver/nurse availability, readiness, coverage
5. **Drivers** — list, missions, shifts, performance, incidents
6. **Nurses & Paramedics** — list, shifts, notes, records, incidents
7. **Ambulances** — fleet, add, maintenance, assignments
8. **Hospital Coordination** — hospitals, referrals, incoming cases
9. **Workforce & Organization** — employees, dispatchers, permissions
10. **Analytics & Reports** — emergency, performance reports
11. **Notifications & Alerts**
12. **System Setup** — regions, districts, areas, stations, categories, equipment, roles, hospitals
13. **Audit Logs**

**Well-implemented admin pages (examples):**

- Emergency request lists: `pending`, `active`, `assigned`, `critical`, `completed`, `cancelled`, `new`, `timeline`, `track/[id]`
- Ambulance management: list, add, maintenance, assignments
- Driver management: list, add, shifts, compliance, performance, attendance
- Nurse management: list, add, shifts, notes, records, incidents
- System setup: regions, districts, areas, stations (tabbed hub)
- Dashboard: overview, live, KPI
- Patients, hospitals, referrals, dispatchers, permissions

**Stub / WIP pages** (use `AdminStubPage` or minimal placeholder):

- `assignment-board`, `audit-logs`, `dispatchers`, `settings`, `triage-assessment`
- Some reports, driver trips, employee attendance

### Driver portal (`frontend/src/app/driver/`)

**Status: actively implemented** — mobile-first driver UI.

| Route | Purpose |
|---|---|
| `/driver/login` | Driver login entry |
| `/driver` | Main dashboard (shift, active mission, quick actions) |
| `/driver/missions` | Mission list |
| `/driver/dashboard` | Redirect alias → `/driver` |

**Driver features built:**

- Profile, shift start/end
- Active mission with one-tap status progression
- Socket.io connection (`useDriverSocket.ts`)
- Offline queue banner
- Zustand store for driver session
- Backend: `drivers-app` module (REST + gateway)

**Driver status quick actions** (from driver dashboard):

```
ASSIGNED → DISPATCHED → ON_SCENE → TRANSPORTING → ARRIVED_HOSPITAL → COMPLETED
```

> Note: driver UI uses `ON_SCENE` in places while Prisma uses `ARRIVED_SCENE`. Align when extending.

### Other role portals

| Portal | Layout | Pages | Status |
|---|---|---|---|
| Dispatcher | `app/dispatcher/layout.tsx` | No dashboard pages yet | Shell only |
| Nurse | `app/nurse/layout.tsx` | No dashboard pages yet | Shell only |
| Hospital | `app/hospital/layout.tsx` | No dashboard pages yet | Shell only |
| Manager | `app/manager/layout.tsx` | No dashboard pages yet | Shell only |
| Patient | `app/patient/layout.tsx` | No dashboard pages yet | Shell only |

**Guards exist** in `frontend/src/components/guards/` for Admin, Driver, Nurse, Dispatcher, Hospital, Manager, Patient.

### Shared components

```
frontend/src/components/
├── ui/                    # shadcn primitives (button, card, input, …)
├── layout/                # Navbar, AdminSidebar, AdminTopBar, Breadcrumbs
├── sections/              # Public page sections (Hero, CTA, Features)
├── features/
│   ├── emergency/         # StatusBadge, PriorityBadge, AssignModal, CancelModal
│   └── system-setup/      # Region/District/Station/Hospital forms
├── dashboard/             # OverviewMetrics, EmergencyQueue, LiveDispatchBoard
├── driver/                # DriverHeader, DriverBottomNav, DriverUI
├── drivers/               # DriverFormSections, DriversStepper
├── nurses/                # NurseFormSections, NursesStepper
├── notifications/         # NotificationBell, LiveActivityTicker
└── guards/                # Role-based route guards
```

---

## Backend Architecture Pattern

Standard NestJS modular layout per feature:

```
module/
├── *.module.ts
├── *.controller.ts
├── *.service.ts
├── dto/           (where used)
└── guards/        (auth module)
```

**Cross-cutting services in `tracking/`:**

- `TrackingService` — public-safe case lookup by code/phone
- `TrackingGateway` — WebSocket broadcast on status changes
- `EtaCalculationService` — estimated arrival (heuristic, not GPS)
- `AuditLogService` — dispatch audit trail
- `NotificationEventEmitterService` — event hooks
- `TrackingAnalyticsService` — analytics helpers

**API base URL:** `http://localhost:3001/api`

**Key public endpoints:**

- `POST /api/emergency-requests` — create case
- `GET /api/emergency-requests/track/:trackingCode` — track case
- Tracking module public routes (see `tracking.controller.ts`)

**Auth endpoints:**

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

---

## Dispatch Process (Operational Detail)

1. **Intake:** Public form (`/hire-ambulance`) or admin creates case (`/admin/emergency-requests/new`).
2. **Queue:** Case appears in Pending / Triage / New Requests views.
3. **Triage:** Dispatcher sets priority (`LOW`–`CRITICAL`) and reviews patient condition fields.
4. **Resource check:** Admin views available ambulances (`getAvailableAmbulances()` excludes busy units).
5. **Assignment:** Dispatcher assigns `ambulanceId`, `driverId`, `nurseId`, `dispatcherId` via assign endpoint/modal.
6. **Notification:** System creates notifications for assigned driver/nurse.
7. **Field ops:** Driver updates status through driver app; each change logs to `EmergencyStatusLog`.
8. **Tracking:** Public user polls or receives WebSocket updates via tracking code.
9. **Hospital:** Referral created; hospital coordination pages manage accept/reject.
10. **Closure:** Status → `COMPLETED`; timestamps and metrics finalized.

---

## UI/UX Design Direction

### Theme

- Modern medical / emergency dispatch aesthetic
- Professional admin dashboard + clean public site
- Mobile-friendly driver portal

### Colors (from `globals.css` and admin sidebar)

| Token | Usage |
|---|---|
| Emergency Red (`--primary`, `#ef4444` family) | CTAs, active nav, alerts |
| Midnight Blue (`#0F1C2E`, `--secondary`) | Admin sidebar background |
| Clinical Blue (`--accent`) | Secondary actions |
| White / soft gray | Cards, backgrounds |
| Success / Warning / Info tokens | Status indicators |

### Design requirements

- Responsive layouts
- Fast access to emergency actions (large buttons on driver UI)
- Clear status & priority badges (`StatusBadge`, `PriorityBadge`)
- Real-time *feel* via WebSocket toasts/tickers (not GPS maps)
- Admin sidebar: collapsible sections with Lucide icons, red active state

---

## Naming Conventions

### Files & code

- **Frontend routes:** kebab-case folders (`emergency-requests/`, `system-setup/`)
- **Components:** PascalCase (`AdminSidebar.tsx`, `AssignModal.tsx`)
- **Backend modules:** kebab-case folders, PascalCase classes (`EmergencyRequestsService`)
- **API paths:** kebab-case (`/api/emergency-requests`, `/api/system-setup`)
- **Prisma models:** PascalCase; table names snake_case via `@@map`

### Domain language

- Prefer **Emergency Request / Case** over "order" or "ride"
- Prefer **Mission** in driver UI for assigned active case
- Prefer **Dispatch** / **Assign** over "auto-match" (manual workflow)
- **Tracking code** = public case reference (`CASE-YYYY-####`)

---

## Current Implementation Status (as of project state)

### Completed / working

- [x] PostgreSQL + Prisma schema with full emergency lifecycle models
- [x] NestJS modular API with auth (JWT + refresh token support)
- [x] Emergency request CRUD, assign, status updates, cancel, escalate
- [x] Public website (home, about, contact, services, hire, tracking)
- [x] Admin dashboard with extensive sidebar and many functional pages
- [x] Ambulance, driver, nurse, patient, hospital, referral backend modules
- [x] System setup master data (regions → districts → areas → stations)
- [x] Notifications with typed priorities
- [x] Reports endpoints (frontend partially wired)
- [x] Tracking module (status-based public tracking + WebSocket)
- [x] Driver mobile portal (frontend + `drivers-app` backend)
- [x] Employee shift/attendance records
- [x] Patient care records & incident reports (schema + nurse pages started)
- [x] Seed data for Somalia/Banadir region

### In progress / partial

- [ ] Unified role model (JWT `role` vs `EmployeeRole` mismatch)
- [ ] Dispatcher dedicated portal (layout only)
- [ ] Nurse dedicated portal (layout only)
- [ ] Hospital portal (layout only)
- [ ] Patient portal (layout only)
- [ ] Many admin sidebar links → stub pages (`AdminStubPage`)
- [ ] Frontend enum sync with Prisma status values
- [ ] Driver status names alignment (`ON_SCENE` vs `ARRIVED_SCENE`)

### Not started (by design / future)

- [ ] Live GPS map tracking
- [ ] SMS / WhatsApp notifications
- [ ] Voice dispatch
- [ ] AI prioritization
- [ ] Multi-branch support
- [ ] Inventory / financial modules

---

## Future Enhancements

Potential next features (from product vision):

- SMS notifications
- WhatsApp alerts
- Real-time maps (when GPS hardware/integration is available)
- Voice dispatch
- AI emergency prioritization
- Multi-branch support
- Inventory management
- Financial tracking

---

## Important Development Notes

1. **Manual dispatch only** — never auto-dispatch without dispatcher action.
2. **No GPS tracking required currently** — tracking = case status + ETA heuristic.
3. **Prioritize emergency workflow clarity** in every feature.
4. **Maintain professional medical UI** — red/white/navy palette, clear badges.
5. **Role-based dashboards** — admin is primary; driver portal is live; other roles pending.
6. **Mobile responsiveness** — especially driver app.
7. **Keep emergency actions quick** — minimal taps for status updates.
8. **Scalable modular architecture** — add features as NestJS modules + Next.js routes.
9. **Source of truth:** `backend/prisma/schema.prisma` for enums and relations.
10. **Do not commit secrets** — use `backend/.env` for `DATABASE_URL`, `JWT_SECRET`.

---

## Local Development

```bash
# Backend (port 3001)
cd backend
npm install
npx prisma generate
npx prisma db push   # or migrate
npm run start:dev

# Frontend (port 3000)
cd frontend
npm install
npm run dev
```

**Environment (`backend/.env`):**

```
DATABASE_URL="postgresql://user:pass@localhost:5432/Aamin01"
JWT_SECRET="your-secret"
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Swagger:** http://localhost:3001/api/docs

---

## Project Quality Goal

The system should look and behave:

- Professional
- Modern
- Production-ready
- Thesis-quality
- Real-world deployable

This project is intended to become a **real operational system** for Aamin Ambulance in Somalia.

---

## Quick Reference for AI Assistants

When working in this codebase:

| Task | Start here |
|---|---|
| Emergency logic | `backend/src/emergency-requests/` |
| Database changes | `backend/prisma/schema.prisma` |
| Admin UI | `frontend/src/app/admin/` + `AdminSidebar.tsx` |
| Driver UI | `frontend/src/app/driver/` + `lib/driverApi.ts` |
| Public forms | `frontend/src/app/(public)/` |
| API client | `frontend/src/lib/api.ts` |
| Types/enums | `frontend/src/types/index.ts` (verify against Prisma) |
| Auth flow | `backend/src/auth/`, `frontend/src/context/AuthContext.tsx` |
| Real-time | `backend/src/tracking/tracking.gateway.ts`, `drivers-app.gateway.ts` |

**Do not** treat README status names as authoritative — use Prisma enums.

**Do not** assume all admin sidebar routes are implemented — check for `AdminStubPage`.

**Do not** add GPS/taxi-style features unless explicitly requested.

---

*Last aligned with codebase structure in repository `Aamin01`.*
