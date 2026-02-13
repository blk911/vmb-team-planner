# Restore Point — 2026-02-13 13:23 (Benchmark)

## Benchmark / Restore Point

**Date/Time:** 2026-02-13 13:23  
**Location:** `backups/restore-2026-02-13_13-23/`

---

## What This Restore Point Contains

| File | Description |
|------|--------------|
| `index.html` | Daily Planner app (main UI, projects, tasks, steps, team, focus) |
| `admin.html` | Admin page (add team members) |
| `firestore.rules` | Firestore security rules |
| `package.json` | Dependencies (serve, firebase-tools) |

---

## App Features (Current State)

- **Projects:** + Project, per-project + Task, reorder, collapse
- **Tasks:** Checkbox, title, OPEN STEPS (notes, steps), by-when, status, ⋮ menu (Focus, Archive, Delete)
- **Project actions:** ⋮ menu with History, Archive, Delete (owner auth)
- **Layout:** OWNER + ⋮ on far right of each project row
- **Top nav:** Gear (expand/collapse all), Exec List (summary + collapsed proj), Projects (collapsed only), + Project
- **Step sequence:** Step count on title line, light green when steps exist, indent tasks/notes
- **Team:** Team modal, Firestore `teamMembers`, Admin page
- **Data:** localStorage (`daily_planner.v1`), Firestore for team

---

## How to Run the App (Local)

```bash
cd c:\dev\vmb-team
npm start
```

Then open: **http://localhost:5000/**

---

## How to Restore From This Backup

### Option A: Manual file copy

```bash
cd c:\dev\vmb-team
copy backups\restore-2026-02-13_13-23\index.html app\index.html
copy backups\restore-2026-02-13_13-23\admin.html app\admin.html
copy backups\restore-2026-02-13_13-23\firestore.rules firestore.rules
copy backups\restore-2026-02-13_13-23\package.json package.json
```

### Option B: Git restore (if committed)

```bash
git checkout restore-2026-02-13_13-23 -- app/index.html app/admin.html firestore.rules package.json
```

### Option C: Git tag (if tag created)

```bash
git checkout tags/restore-2026-02-13_13-23
```

---

## Deployment Options

| Target | Command | Notes |
|--------|---------|------|
| **Firebase Hosting** | `firebase deploy` | Deploys `app/` to Firebase; requires `firebase login` |
| **Git** | `git add .` then `git commit` then `git push` | Pushes code to remote (e.g. GitHub) |
| **Other** | Manual upload | Copy `app/` folder to any static host |
