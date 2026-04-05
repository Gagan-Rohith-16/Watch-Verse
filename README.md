# Watch Verse Web App

A modern, responsive entertainment tracker app (Watch Verse) that supports:

- Categories (Movies, Anime, Series + custom categories)
- Per-category lists: **To Watch** and **Watched**
- Add, move, and delete items
- Real-time case-insensitive search
- Drag-and-drop between lists
- Toast notifications and empty states
- Persistent storage with **IndexedDB**

## Folder Structure

```text
entertainment-tracker/
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
