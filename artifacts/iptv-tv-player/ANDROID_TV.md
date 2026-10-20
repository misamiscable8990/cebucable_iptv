# Android TV build

The project includes a native LibVLC view because Android's built-in Expo video
player does not read the playlist's UDP multicast URLs. The Android TV build
joins the selected multicast group, plays the stream, and keeps the last
selected channel on the device.

## Build locally

1. Install Android Studio and its Android SDK on a computer.
2. From the project root, install dependencies and generate the Android project:

   ```sh
   pnpm install
   pnpm --filter @workspace/iptv-tv-player exec expo prebuild --platform android
   ```

3. Open `artifacts/iptv-tv-player/android` in Android Studio and build the
   debug APK, or run `./gradlew assembleDebug` from that folder.
4. Install the resulting APK on the Android TV device.

The app registers as a landscape Android TV launcher app. The native module
bundles LibVLC (`org.videolan.android:libvlc-all`); follow its LGPL license
requirements when redistributing the APK.

## Network requirements

- The TV must be on the same multicast-enabled LAN as the streams.
- The router or switch must allow IGMP/multicast traffic to reach the TV.
- Some Wi-Fi access points block multicast; wired Ethernet is often more
  reliable.
- The Replit preview can show the guide but cannot join the user's LAN multicast
  groups. Test actual playback on the Android TV device.
