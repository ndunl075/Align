# Align

Web app for planning events with friends: create a plan, share a link, mark **free** / **busy** / **clear** on proposed times, and see a **group heatmap** of who’s available when.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** v4
- **Firebase** Authentication (Google + email) and **Cloud Firestore**
- **react-router-dom** for `/`, `/create`, `/join`, `/join/:shareCode`

## Setup

1. **Node.js** (v20+ recommended) and **npm**.
2. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

3. Create a Firebase project, enable **Firestore**, and add a **Web app** to get the config object.

4. Copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values from the Firebase console (same fields as the `firebaseConfig` snippet).

5. Publish **Firestore rules** from this repo (`firestore.rules`) in the Firebase console (Firestore → Rules → Publish). The default “deny all” rules will block the app until you do.

6. Run the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command       | Description                |
| ------------- | -------------------------- |
| `npm run dev` | Local dev server (Vite)    |
| `npm run build` | Production build       |
| `npm run preview` | Preview production build |
| `npm run lint`  | ESLint                   |

## Deploy

Build outputs to `dist/`. Host it on any static host (Firebase Hosting, Netlify, etc.) and configure the **same** `VITE_FIREBASE_*` environment variables at build time. Set **`VITE_PUBLIC_SITE_URL`** to your live origin (no trailing slash), e.g. `https://your-app.netlify.app`, so **Open Graph** / social previews get a correct `og:url`. Ensure your Firebase **API key** application restrictions allow your production origin (and local dev URLs if you use HTTP referrer restrictions).

Link preview text comes from `index.html` (`title`, `description`, Open Graph, Twitter). Update those strings if you change positioning; the in-app tagline is in `src/branding.ts`.

## Troubleshooting

- **Nothing saves / timeouts:** Confirm Firestore exists, rules are published, and the browser can reach `*.googleapis.com` (ad blockers, VPNs, and strict API key referrer lists are common causes).
- **Env not loading:** Variable names must start with `VITE_`. Restart the dev server after editing `.env.local`.

## License

Private / all rights reserved unless you add a license file.
