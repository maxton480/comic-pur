# Comicpur

A clean, mobile-first comic reading web app with Firebase backend and GitHub Pages hosting.

## 🌐 Live App
[https://maxton480.github.io/comic-pur/](https://maxton480.github.io/comic-pur/)

---

## 🚀 Setup

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/maxton480/comic-pur.git
git push -u origin main
```

### 2. Enable GitHub Pages
- Go to **Settings → Pages**
- Source: **GitHub Actions**
- Wait for the deploy workflow to finish

### 3. Paste Firestore Security Rules
- Open [Firebase Console](https://console.firebase.google.com/project/comicpur-e6725/firestore/rules)
- Replace existing rules with contents of `firestore.rules`
- Click **Publish**

### 4. Firebase Auth Setup
- Enable **Email/Password** in Authentication → Sign-in method
- Add `https://maxton480.github.io` to Authorized Domains

---

## 📱 Android APK Build

### Automatic (GitHub Actions)
1. Go to **Actions → Build Android APK**
2. Click **Run workflow**
3. Download the APK from the Artifacts section

### Manual (Local)
```bash
pnpm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📂 Project Structure

```
comicpur/
├── index.html          # Home page
├── comic.html          # Comic detail / chapter list
├── reading.html        # Reading view
├── search.html         # Search
├── profile.html        # Library & history
├── login.html          # Auth
├── admin.html          # Admin panel (maxton480@gmail.com only)
├── firebase.js         # Firebase init + helpers
├── nav.js              # Shared nav + utilities
├── style.css           # All styles
├── sw.js               # Service worker (PWA)
├── manifest.webmanifest
├── firestore.rules     # Paste into Firebase Console
└── .github/workflows/
    ├── deploy.yml      # Auto-deploy to GitHub Pages
    └── build-apk.yml   # Build Android APK
```

---

## 🔒 Security

- Firestore rules enforce field validation, length limits, and enum checks
- Library status limited to: `reading`, `completed`, `on_hold`, `dropped`, `plan_to_read`
- Comic folder is immutable after creation (prevents URL hijacking)
- Admin panel protected by email check (`maxton480@gmail.com` only)
- Login `next` redirect param sanitized to relative URLs only

---

## 🖼️ GitHub Images Repo

Comics are hosted at:
`https://raw.githubusercontent.com/maxton480/comics/main/`

Folder structure:
```
comics/
└── <folder>/
    ├── cover.jpg
    └── <chapter-folder>/
        ├── 001.jpg
        ├── 002.jpg
        └── ...
```

Admin panel → Sync from GitHub automatically detects chapters and page counts.
