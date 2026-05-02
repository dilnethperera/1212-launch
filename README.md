# 12:12 — Album Launch Vote Website

## Files
- `index.html` — Main page structure
- `style.css`  — Red & black cinematic theme
- `app.js`     — Frontend logic (loads/submits votes via API)
- `server.js`  — Express + MongoDB backend API
- `.env.example` — Example environment configuration

## Setup (MongoDB + API)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set your MongoDB connection:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017
   DB_NAME=launch1212
   PORT=3000
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000`

## Customising Songs
Edit the `SONGS` array in `app.js` to change the 12 track names:
```js
const SONGS = [
  { id: 1, title: "YOUR TRACK NAME" },
  ...
];
```

## Notes
- Votes and comments are stored in MongoDB and shared across devices using the same backend.
- The one-vote-per-device check still uses browser localStorage (`1212_has_voted`).
- If backend is unavailable, the UI will show a connection error until server is running.
