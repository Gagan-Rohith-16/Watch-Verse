# Watch Verse Web App

## About

Watch Verse is a responsive entertainment tracker for managing movies, anime, and series in one place. It helps you organize what you plan to watch and what you have already completed, with fast search and persistent local storage.

### Core Features

- Categories (Movies, Anime, Series + custom categories)
- Per-category lists: **To Watch** and **Watched**
- Add, move, and delete items
- Real-time case-insensitive search
- Drag-and-drop between lists
- Toast notifications and empty states
- Persistent storage with **IndexedDB**

## APK Reference

A debug APK is included for quick reference/testing:

- `apk/watch-verse-debug.apk`

## Folder Structure

```text
entertainment-tracker/
  apk/
    watch-verse-debug.apk
  index.html
  styles.css
  js/
    app.js
    db.js
  README.md
```

## Run Locally

Because this app uses ES modules, run it with a local web server.

### Option 1: Python

```bash
cd entertainment-tracker
python -m http.server 5500
```

Open: `http://localhost:5500`

### Option 2: VS Code Live Server

1. Open `entertainment-tracker` in VS Code.
2. Start Live Server from the editor.
3. Open the generated local URL.

## Notes

- Data is stored in IndexedDB database: `entertainment_tracker_db`
- Data persists across refreshes and browser restarts.
- Poster image URL is optional; if missing or broken, a fallback card appears.
