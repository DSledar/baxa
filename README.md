# بەخەی قەساب 3D (Bakha the Butcher 3D Action RPG)

A free-roam First-Person / Third-Person 3D Action RPG built with **Three.js (WebGL + UnrealBloomPass + Custom GLSL Shaders)**, **Bootstrap 5 RTL**, **Web Audio API**, and **Firebase**.

## Features
- **Free-Roam 3D World**: Explore Bakha's Butcher Shop, Barzan Village, Dark Forest, Ancient Stone Temple, and the Frost Cave Boss Arena.
- **Toggleable FPP / TPP**: Press `V` or click the camera button to switch seamlessly between First-Person and Third-Person perspectives.
- **Real-Time Cleaver Combat**: Swing with `Space`, stun enemies with Wolf Howl (`Q`), unleash Blood Rage (`R`), dodge (`C`), and heal with roasted meat (`E`).
- **Expanded 8-Chapter Sorani Kurdish Story**: All 8 chapters with additional tactical choices and a **3-Phase Father of Darkness Boss Fight**.
- **Firebase Cloud Saves & Leaderboard**: Google Sign-In, Realtime Database saves, and Honor Leaderboard (with automatic `localStorage` fallback).

## GitHub Pages & Firebase Setup
1. Push the contents of this folder to a GitHub repository.
2. Enable **GitHub Pages** from **Settings → Pages → Deploy from branch (`main` / `root`)**.
3. Open `js/firebase-config.js` and replace `FIREBASE_CONFIG` with your Firebase project's web credentials.
4. In Firebase Console, enable **Google Authentication** and **Realtime Database** (add your `*.github.io` domain to Authorized Domains).
