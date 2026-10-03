# MUSCLE T FITNESS GYM

React 19 / Next.js internal gym management application. Members and walk-ins do not have login accounts.

## Run locally

Open this folder and double-click `start-gym.cmd`, or run:

```powershell
cd C:\Users\rodwin\Downloads\muscle-t-fitness-gym
npm run dev
```

Open http://127.0.0.1:3000. Only one development server should run at a time.

`install-dependencies.cmd` installs dependencies from the correct folder. React, Upstash Redis, Upstash rate limiting and browser testing dependencies are installed.

## Local data and accounts

`.env.local` selects local development storage. `.local-data/store.json` contains local records and hashed passwords. Preserve this directory to retain your records. It is excluded from Git. Do not edit it while the application is running. Local storage is intended for one development machine, not production hosting.

The original administrator credentials are in `.admin-credentials.json` (excluded from Git). The application requires a new password after initial login. That file is not updated when you change your password. Running `npm run setup:admin` never resets an existing database or account.

## Features

- Dashboard quick actions, eight metrics, expiration filters, recent activity and notifications.
- Member registration, edit, profile/history, status changes, archive/restore, notes and walk-in conversion.
- Membership validation and a 15-minute duplicate check-in guard.
- Walk-ins, payments, payment voiding, renewal history and printable receipts.
- Plan and staff account management with server-side role enforcement.
- Search, sorting, pagination, status filters, CSV exports, date-range reports, Excel-compatible XML export and browser Print / Save PDF.
- All record changes use forms in modals and explicit confirmation before saving.
- Audit history is append-only through the application; financial records are voided rather than deleted.

## Upstash later

Set `GYM_STORAGE=upstash`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GYM_NAMESPACE=production`, and `APP_ORIGIN` to your exact HTTPS application origin in the server environment. Never use NEXT_PUBLIC variables for secrets. Run `npm run setup:admin` against the configured destination to initialize a fresh database. Local records are not automatically migrated. Upstash connectivity has not been tested with live credentials.

The Redis adapter saves a versioned gym document using atomic compare-and-set so membership, payment and audit records commit together. This is suitable for evaluating a small gym workflow; a large deployment should use indexed entity storage and server pagination before importing a large history. Redis does not implement SQL foreign keys; application operations validate record relationships.

## Checks

```powershell
npm run typecheck
npm run test:workflows
# Start the local app before this command. Uses installed Microsoft Edge in headless mode.
npm run test:browser
npm run build
```

Workflow tests run on isolated records. Browser tests replace API responses with an isolated test state and exercise the real rendered forms; they never write test members or payments into your gym database. They cover registration, check-in, walk-ins, page actions, profile/history, receipts, reports, mobile menu and modal usability.

## Daily, monthly and annual transactions

The Transactions page includes payments/revenue, registrations, renewals, walk-ins and check-ins. Select a day, month or calendar year. Annual Transactions includes January–December totals. Revenue counts paid payment records once; voided payments are retained separately, and cancelled walk-ins do not count as visits. Timestamped events use Asia/Manila business dates. Filter activity type/payment status and export CSV, Excel-compatible XML or Print / Save PDF.

Run `npm run test:transactions` for total, date-boundary, leap-year and monthly-breakdown checks.

## Deploy to Vercel

Import this GitHub repository into Vercel and select Next.js. Use the standard build command `npm run build`. Configure server-side environment variables:

- `GYM_STORAGE=upstash`
- `GYM_NAMESPACE=production`
- `UPSTASH_REDIS_REST_URL` and a current `UPSTASH_REDIS_REST_TOKEN`
- `APP_ORIGIN=https://your-exact-production-domain.vercel.app` (no trailing slash)

Redeploy after changing environment variables. Keep secrets out of Git and browser-exposed variables. Initialize the production database by running `npm run setup:admin` from a trusted local shell with those same destination variables configured. This creates an admin only for a fresh database. Existing local records are not migrated automatically. Live Upstash and Vercel deployment have not been verified.

## PDF exports

Tables now offer direct Download PDF, using all filtered and sorted records across pagination. PDFs use an A4 layout with gym contact details, report title/period, readable wrapped tables, repeated column headers, generated date, staff name and page numbers. Wide tables automatically use landscape pages. Currency is rendered as PHP for reliable PDF font support.

Transactions export includes period totals and, for Annual Transactions, a complete January–December breakdown. Reports has Download complete PDF covering the summary, revenue, attendance, walk-ins, renewals and most frequent members. Receipts download as portrait PDFs; voided receipts show their status and reason. CSV and Excel-compatible exports remain available.

`npm run test:pdf` verifies multipage content, totals, final rows, page width bounds, empty states, and receipts. Browser tests also download receipt, report and transaction PDFs using isolated test records.

PDF actions use **Export PDF** and download a `.pdf` directly without a print dialog. Filenames include the configured gym name, data type, and selected period (or the current Philippine date for record snapshots), for example `MUSCLE-T-FITNESS-GYM_Walk-ins_2026-10-03.pdf`. Receipts use their payment date; transaction and report exports use the selected period.
