# Vklass Sync - Product Requirements Document

## Overview
**App Name:** Vklass Sync  
**Purpose:** Monitor two iCal calendar feeds and display events on a public dashboard with change detection and push notifications.

## Original Problem Statement
The user requested a full-stack application to monitor two user-provided iCal calendar feeds at configurable intervals (5, 15, 30, 60 minutes). Events should be displayed in a two-column layout with change detection (new/removed events) and push notifications via Webpushr.

## Core Requirements
- Fetch data from two iCal links at configurable intervals
- Two-column layout for calendar events on public dashboard
- Change detection:
  - **New events:** Marked in amber/yellow, require manual confirmation
  - **Removed events:** Marked in gray, auto-disappear after 24 hours
  - **Past events ("Utfört"):** Highlighted with cyan background, Vault Boy image
- Push notifications via Webpushr with calendar name and event details
- Public dashboard + password-protected settings page
- Filter out events with both start AND end time (meetings vs all-day tasks)
- "Fallout" / "Pip-Boy" theme with green monochrome aesthetic, terminal font, scanlines, screen flicker
- Weekly summary statistics page with graphs

## Tech Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui, sonner (toasts), recharts (graphs)
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB driver), icalendar, pytz
- **Database:** MongoDB
- **Push Notifications:** Webpushr

## Key Features Implemented

### Dashboard (Public)
- Two-column calendar display
- Countdown timer synced with backend sync schedule
- Event status badges (Nytt, Borttagen, Utfört, Aktiv)
- Manual sync button
- Fallout theme with scanlines and screen flicker effect
- Active events sorted by date (nearest first), Utfört at bottom

### Stats Page (/stats)
- Weekly summary of time spent per subject
- Bar charts and pie charts per calendar
- Summary cards with total time
- Fallout-themed design
- Push notifications link directly to this page

### Settings (Password Protected)
- iCal URL configuration for both calendars
- Calendar name customization
- Sync interval selection (5, 15, 30, 60 min)
- Webpushr API configuration with test user ID
- Password protection toggle
- Sound effects settings (on/off + volume)
- Impact Effect toggle
- Screen Wake Lock toggle
- Event mappings table (CID -> Subject, Event ID -> Type)
- Custom event creation with push notification option

### Backend
- iCal feed parsing with stable event identification (summary + start_date hash)
- Background scheduler for periodic sync
- Change detection and notification system
- Auto-cleanup of removed events after 24 hours
- Auto-cleanup of Utfört events after 1 month
- Swedish timezone (Europe/Stockholm) for all time calculations
- Weekly summary job (Fridays at 16:00)
- "Utfört" notification job (checks every minute)

## Database Schema
- **settings (singleton):** `{ ical_urls, calendar_names, sync_interval, webpushr_keys, webpushr_test_user_id, auth_config, last_sync_time, sound_enabled, sound_volume, impact_effect_enabled, screen_wake_lock, event_mappings }`
- **events (collection):** `{ uid, calendar_id, summary, description, start, end, event_time, status, url, subject_name, event_type, notified_utfort, created_at }`
- **sync_status (singleton):** `{ last_sync }`

## API Endpoints
- `GET /api/settings` - Get app configuration
- `PUT /api/settings` - Update configuration
- `GET /api/events` - Get all events with mapped subjects/types
- `POST /api/events/create` - Create custom event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/confirm` - Confirm new event
- `POST /api/sync` - Trigger manual sync
- `GET /api/sync-status` - Get countdown timer data
- `POST /api/auth/login` - Authenticate for settings
- `POST /api/test-push` - Send test notification
- `GET /api/stats/weekly` - Get weekly summary data
- `POST /api/test-notification?type=weekly` - Send test weekly summary

## File Structure
```
/app/
├── backend/
│   ├── server.py        # All backend logic (monolith - needs refactoring)
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js
│       ├── index.css    # Fallout theme styles
│       └── components/
│           ├── Dashboard.jsx
│           ├── Settings.jsx
│           ├── Stats.jsx        # NEW: Weekly statistics page
│           ├── Login.jsx
│           ├── AddToHomeScreen.js
│           ├── ScreenFlicker.js
│           └── ImpactEffect.jsx
```

## Completed Work (March 2026)
- [x] Full Fallout/Pip-Boy theme implementation
- [x] Two-column calendar layout
- [x] iCal parsing with stable event identification
- [x] Change detection (new/removed/utfört events)
- [x] Push notifications via Webpushr
- [x] Password-protected settings
- [x] Countdown timer synced with backend
- [x] Screen flicker effect (random)
- [x] Electrical spark sound effects (Web Audio API) - synced with flicker
- [x] Sound settings in Settings page (on/off toggle + volume slider)
- [x] Screen wake lock setting (prevent screen from sleeping)
- [x] iOS "Add to Home Screen" popup
- [x] Toast notification auto-hide (3s duration)
- [x] Scanlines effect (adjustable)
- [x] CID-till-ämne mappning (auto-upptäckt av CID från event URLs)
- [x] Visa ämnesnamn på eventkort i Dashboard (grön badge)
- [x] Ämnesnamn i push-notifikationer (format: [Ämne] Händelse)
- [x] Fallout-ikon för push-notifikationer, favicon och webapp
- [x] Databasstatus-sektion i Settings med migrations-knapp
- [x] Läxa/Prov-kopplingar (event ID -> typ) med lila badge på eventkort
- [x] Kombinerad 4-kolumnstabell för händelsekopplingar (CID | Ämne | ID | Läxa/Prov)
- [x] Impact Effect - cinematisk effekt när timern når noll
- [x] Wake Lock-funktion med tänd/släckt glödlampa-ikon
- [x] 15-sekunders offset i timer för Impact Effect-duration
- [x] Toast-notiser fungerar korrekt på Safari/iOS
- [x] Custom events (skapa manuella händelser)
- [x] Push notification för Utfört events
- [x] Swedish timezone för alla tidsberäkningar
- [x] Weekly summary background job (Fridays 16:00)
- [x] **Stats page (/stats)** - Veckostatistik med grafer (2026-03-06)
- [x] **Stats uses scheduled activities** - Hämtar events med start- och sluttid för verklig tidsberäkning (2026-03-06)
- [x] **Stats week navigation** - Bläddra framåt/bakåt mellan veckor (2026-03-06)

## Backlog / Future Tasks
- [ ] Refactoring: Dela upp backend/server.py i moduler (routes/, services/, models/)
- [ ] Refactoring: Dela upp Settings.jsx i mindre komponenter
- [ ] Refactoring: Dela upp Dashboard.jsx i mindre komponenter

## Known Credentials
- **Settings Password:** 2378

## Status: ACTIVE DEVELOPMENT
Weekly statistics page implemented. Push notifications for weekly summary now link to /stats page.
