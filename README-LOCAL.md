# Butchi Management – local and shared-device setup

## Install dependencies

```bash
npm install
```

The uploaded `node_modules` folder and old lockfile were generated for a different platform/dependency set. Install fresh dependencies on your own Mac/PC before running the project.

## Run with Owner and Rider on separate devices (same Wi-Fi)

Open two terminals in this project folder.

**Terminal 1 – shared data server**

```bash
npm run server
```

**Terminal 2 – web app**

```bash
npm run dev
```

On the Owner laptop, open the Vite URL printed in Terminal 2 (usually `http://localhost:5173`).

On the Rider phone, connect to the same Wi-Fi and open `http://YOUR-LAPTOP-LAN-IP:5173` (replace with the laptop's local IP address). The Vite server proxies `/api` requests to the shared server on port 3000. Keep both terminals running.

The shared server stores the current store state in `data/store.json`. Devices poll for updates approximately every two seconds. Each device still keeps a local cache for temporary offline use; offline changes are not shared until the API reconnects.

## Production build

```bash
npm run build
npm start
```

The Node server serves the built app and the shared `/api/state` endpoint on port 3000. Use persistent storage for the `data/` directory when hosting this on a cloud service.

## Important deployment note

This version shares data but does not yet implement secure Owner/Rider sign-in. The Owner/Rider switch is a view selector, not authentication. Keep it on a trusted private network for testing; add proper accounts and role-based API authorization before exposing it publicly.

On macOS, you can usually find the laptop's Wi-Fi IP with:

```bash
ipconfig getifaddr en0
```

## UI refresh

The interface uses a warm cream-and-bakery-orange visual theme with rounded cards, softer borders and shadows, and consistent Owner/Rider styling. Existing order, menu, rider, map, settings, and offline/shared-server workflows are retained.

## Environment setup

Copy `.env.example` to `.env` and fill in your own local values if needed. Do not share your `.env` file or commit API keys/secrets.
