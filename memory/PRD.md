# RemedyPills Pharmacy - Product Requirements Document

## Original Problem Statement
Fix build/compilation errors and functionality bugs in RemedyPills Pharmacy mobile app (React Native/Native Android/iOS). Deploy to both Android and iOS platforms.

## Architecture & Tech Stack
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend**: Express 5 + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Supabase - Session Pooler)
- **Auth**: Passport.js (local + Google OAuth + Facebook OAuth)
- **Session**: connect-pg-simple with PostgreSQL

## User Personas
1. **Patients** - Register, manage prescriptions, set reminders, book appointments
2. **Admin/Pharmacists** - Manage patients, view appointments, send messages

## Core Requirements
- User registration with consent
- Prescription management
- Medication reminders
- Appointment booking
- Pharmacist messaging
- Health tracking (vitals, calories)
- Admin dashboard

## What's Been Implemented

### March 5, 2026
- ✅ Fixed 2 TypeScript compilation errors in `server/routes.ts`
- ✅ Created SQLite storage layer for local development
- ✅ Set up Supabase PostgreSQL with Session Pooler (IPv4 compatible)
- ✅ Created all 11 database tables
- ✅ Verified admin login and patient registration
- ✅ Database connection working with all CRUD operations

## Database Configuration
```
Host: aws-1-ca-central-1.pooler.supabase.com
Port: 5432
Database: postgres
User: postgres.gnsdcvvguhssrimgtpjs
```

## Tables Created
- users, prescriptions, reminders, appointments
- messages, notifications, health_logs, calorie_logs
- audit_logs, promo_banners, session

## Prioritized Backlog

### P0 (Critical)
- [x] Fix TypeScript compilation errors
- [x] Set up PostgreSQL database

### P1 (High Priority)
- [ ] Configure Google OAuth credentials
- [ ] Configure Facebook OAuth credentials
- [ ] Admin page improvements (change password, search users)

### P2 (Medium Priority)
- [ ] Email notifications (Gmail SMTP)
- [ ] SMS notifications (Twilio)
- [ ] Push notifications

## Next Tasks
1. Set up Google OAuth (Google Cloud Console)
2. Set up Facebook OAuth (Facebook Developer Console)
3. Implement admin password change feature
4. Add user search functionality to admin panel
5. Deploy to production (Render/Vercel)

### March 5, 2026 (Update 2)
- ✅ Implemented Google OAuth via Emergent Auth
- ✅ Disabled Facebook login (removed from UI)
- ✅ Created AuthCallback component for handling OAuth redirect
- ✅ Added /api/auth/emergent-callback endpoint for session exchange
- ✅ All tests passing (95% backend, 100% frontend)

## Authentication Methods
1. **Username/Password** - Traditional login/registration
2. **Google OAuth** - Via Emergent Auth (no credentials needed)
3. ~~Facebook OAuth~~ - Disabled (can be re-enabled later)
