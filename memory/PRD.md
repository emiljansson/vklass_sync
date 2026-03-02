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
  - **Removed events:** Marked in red, auto-disappear after 6 hours
  - **Past events:** Highlighted with cyan/light blue background
- Push notifications via Webpushr with calendar name and event details
- Public dashboard + password-protected settings page
- Filter out events with both start AND end time (meetings vs all-day tasks)
- "Fallout" / "Pip-Boy" theme with green monochrome aesthetic, terminal font, scanlines, screen flicker

## Tech Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui, sonner (toasts)
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB driver), icalendar
- **Database:** MongoDB
- **Push Notifications:** Webpushr

## Key Features Implemented

### Dashboard (Public)
- Two-column calendar display
- Countdown timer synced with backend sync schedule
- Event status badges (Nytt, Borttagen, Utfört, Aktiv)
- Manual sync button
- Fallout theme with scanlines and screen flicker effect

### Settings (Password Protected)
- iCal URL configuration for both calendars
- Calendar name customization
- Sync interval selection (5, 15, 30, 60 min)
- Webpushr API configuration
- Password protection toggle
- Test push notification button

### Backend
- iCal feed parsing with stable event identification (summary + start_date hash)
- Background scheduler for periodic sync
- Change detection and notification system
- Auto-cleanup of removed events after 6 hours

## Database Schema
- **settings (singleton):** `{ ical_urls, calendar_names, sync_interval, webpushr_keys, auth_config, last_sync_time }`
- **events (collection):** `{ uid, calendar_id, summary, start_date, status, created_at }`
- **sync_status (singleton):** `{ last_sync, next_sync }`

## API Endpoints
- `GET /api/settings` - Get app configuration
- `PUT /api/settings` - Update configuration
- `GET /api/events` - Get all events
- `POST /api/events/{id}/confirm` - Confirm new event
- `POST /api/sync` - Trigger manual sync
- `GET /api/sync-status` - Get countdown timer data
- `POST /api/auth/login` - Authenticate for settings
- `POST /api/test-push` - Send test notification

## File Structure
```
/app/
├── backend/
│   ├── server.py        # All backend logic
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js
│       ├── index.css    # Fallout theme styles
│       └── components/
│           ├── Dashboard.jsx
│           ├── Settings.jsx
│           ├── Login.jsx
│           ├── AddToHomeScreen.js
│           └── ScreenFlicker.js
```

## Completed Work (March 2026)
- [x] Full Fallout/Pip-Boy theme implementation
- [x] Two-column calendar layout
- [x] iCal parsing with stable event identification
- [x] Change detection (new/removed/past events)
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

## Database Schema
- **settings (singleton):** `{ ical_urls, calendar_names, sync_interval, webpushr_keys, auth_config, last_sync_time, sound_enabled, sound_volume, event_mappings }`
- **events (collection):** `{ uid, calendar_id, summary, start_date, status, url, created_at }`
- **sync_status (singleton):** `{ last_sync, next_sync }`
- **event_mappings:** stored in settings as `[{cid: string, subject: string, event_id: string, event_type: string}]`

## Known Credentials
- **Settings Password:** 2378

## Status: COMPLETE
All user-requested features have been implemented and tested. Application ready for production deployment.
