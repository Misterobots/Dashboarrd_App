# Dashboarrd Mobile - Cloud Build Guide

This project is a dedicated, programmatic controller for your Radarr and Sonarr media servers, built for Android.

## How to get your APK without a computer:

1. **Create a GitHub Repository**: Create a new private or public repo on GitHub.
2. **Upload this code**: Push all files to that repository.
3. **Set your API Key (Optional)**:
   - Go to your Repo **Settings** > **Secrets and variables** > **Actions**.
   - Create a "New repository secret" named `GEMINI_API_KEY` (if utilizing any future AI features).
4. **Run the Build**:
   - Go to the **Actions** tab in your GitHub repo.
   - Select "Build Android APK" on the left.
   - Click **Run workflow**.
5. **Download**:
   - Wait ~8 minutes for completion.
   - Click on the completed run.
   - Scroll down to **Artifacts** and download `dashboarrd-mobile-debug`.
   - Transfer the `.apk` to your phone and install it!

*Note: You may need to enable "Install from Unknown Sources" on your Android phone to install the APK.*