/**
 * App Distribution Configuration
 *
 * Update these URLs after EAS builds complete:
 * 1. Run `eas build:list` to get download URLs
 * 2. For Android: Copy the APK download URL from the "preview" build
 * 3. For iOS: Use TestFlight public link or EAS internal distribution URL
 *
 * IMPORTANT:
 * - Android APK: Direct download link from EAS
 * - iOS: TestFlight invite link or EAS distribution page
 * - Never use fake App Store URLs before actual submission
 */

export const APP_DISTRIBUTION = {
  android: {
    // Update after build completes
    apkUrl: process.env.NEXT_PUBLIC_ANDROID_APK_URL || "",
    // For future Play Store launch
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL || "",
    isLive: !!process.env.NEXT_PUBLIC_ANDROID_APK_URL,
  },
  ios: {
    // TestFlight or EAS internal distribution
    testFlightUrl: process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL || "",
    // For future App Store launch
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL || "",
    isLive: !!process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL,
  },
};

/**
 * Helper to get the correct download URL based on build status
 */
export function getDownloadUrl(platform: "ios" | "android"): string {
  if (platform === "android") {
    return (
      APP_DISTRIBUTION.android.playStoreUrl || APP_DISTRIBUTION.android.apkUrl
    );
  }
  return APP_DISTRIBUTION.ios.appStoreUrl || APP_DISTRIBUTION.ios.testFlightUrl;
}

/**
 * Helper to determine if platform is available for download
 */
export function isPlatformAvailable(platform: "ios" | "android"): boolean {
  return platform === "android"
    ? APP_DISTRIBUTION.android.isLive
    : APP_DISTRIBUTION.ios.isLive;
}
