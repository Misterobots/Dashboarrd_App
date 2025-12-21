# Dashboarrd Mobile

[![Build Android APK (Dashboarrd)](https://github.com/Misterobots/Dashboarrd_App/actions/workflows/android-build.yml/badge.svg)](https://github.com/Misterobots/Dashboarrd_App/actions/workflows/android-build.yml)

**Dashboarrd Mobile** is a native Android application designed to interface programmatically with your home media server (Radarr/Sonarr). It allows for library management, discovery, and queue monitoring directly from your mobile device.

## 🚀 Features

*   **Library Management**: View and manage Movies (Radarr) and Series (Sonarr).
*   **Discovery**: Search for new content and request it directly to your server.
*   **Activity Queue**: Monitor active downloads and queue status in real-time.
*   **Disk Health**: Monitor free space and server connectivity.
*   **Backup & Restore**: Export your server configuration to JSON for safe-keeping.

## 📱 How to Install (APK)

Since this app is not on the Play Store, you must install it manually via the GitHub Actions build artifact:

1.  Navigate to the **[Actions Tab](https://github.com/Misterobots/Dashboarrd_App/actions)** in this repository.
2.  Click on the latest **"Build Android APK"** workflow run (look for the green checkmark).
3.  Scroll down to the **Artifacts** section.
4.  Click **`dashboarrd-mobile-debug`** to download the zip file.
5.  Extract the `.apk` file to your Android phone.
6.  Tap to install (You may need to allow "Install from Unknown Sources").

## 🛠 Building Locally

If you prefer to build the source code yourself:

```bash
# 1. Install Dependencies
npm install

# 2. Build Web Assets
npm run build

# 3. Add Android Platform (if missing)
npx cap add android

# 4. Sync Capacitor
npx cap sync

# 5. Open in Android Studio
npx cap open android
```

## ⚠️ Connectivity

For the app to work, your phone must be on the same local network (Wi-Fi) as your media server, or you must be using a VPN/Reverse Proxy.

*   **Standard Local Setup**: Use your server's local IP (e.g., `http://192.168.1.50:7878`).
*   **Do NOT use `localhost`**: `localhost` refers to the phone itself, not your computer.
