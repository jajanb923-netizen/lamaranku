// ---------------------------------------------------------------------------
// Firebase project configuration for LamaranKu.
// ---------------------------------------------------------------------------
// PLACEHOLDER — no real project yet. The app runs fully in LOCAL TEMPLATE
// MODE until a real Firebase project is created and its web config is
// pasted here (see the 5 steps below). The values below are Firebase web
// client identifiers — public by design (Firebase docs: they identify the
// project, they are not secret keys). No Gemini API key or other secret
// belongs in this repository.
//
// FREE SETUP (5 minutes, no payment, Spark free tier):
//   1. console.firebase.google.com → Create project (e.g. "lamaranku").
//   2. Build → AI Logic → Get started → enable the Gemini Developer API
//      backend.
//   3. Project settings → Your apps → Web app (</>) → register the app.
//   4. Copy the firebaseConfig object and paste it below, replacing the
//      "YOUR_..." placeholders.
//   5. If the Firebase console enforces App Check for AI Logic, register a
//      debug token (App Check → Manage debug tokens) and set it in
//      js/ai.js (self.FIREBASE_APPCHECK_DEBUG_TOKEN); debug tokens are
//      accepted in hackathon submissions.
//
// With a real config, the app calls Firebase AI Logic with
// InferenceMode.PREFER_ON_DEVICE (Gemini Nano on Chrome, falling back to
// gemini-3.5-flash-lite in the cloud). Without it, js/ai.js falls back to
// the built-in letter/CV templates, clearly labelled "Template · Lokal".
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyDyBUBtDNxB2hNJVK8xJVQDGO2ZAzIVNkY",
  authDomain: "lamaranku.firebaseapp.com",
  projectId: "lamaranku",
  storageBucket: "lamaranku.firebasestorage.app",
  messagingSenderId: "839313390479",
  appId: "1:839313390479:web:4481784f10fca3abff29fa",
};

// True when a real Firebase project has been pasted in above.
export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";
