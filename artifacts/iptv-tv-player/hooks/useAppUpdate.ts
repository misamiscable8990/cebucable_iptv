import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';

export type UpdateInfo = {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes?: string;
};

const GITHUB_VERSION_URL = 'https://raw.githubusercontent.com/misamiscable8990/cebucable_iptv/main/version.json';
const CURRENT_VERSION = '1.0.0';
const CURRENT_VERSION_CODE = 1;

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      const response = await fetch(GITHUB_VERSION_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const remoteData: UpdateInfo = await response.json();

      if (
        remoteData.versionCode > CURRENT_VERSION_CODE ||
        remoteData.version > CURRENT_VERSION
      ) {
        setUpdateInfo(remoteData);
        setUpdateAvailable(true);
      }
    } catch (err: any) {
      console.log('Update check failed:', err?.message);
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo?.apkUrl) return;
    try {
      await Linking.openURL(updateInfo.apkUrl);
    } catch (err: any) {
      console.log('Failed to open update URL:', err?.message);
    }
  }, [updateInfo]);

  useEffect(() => {
    if (updateAvailable && updateInfo?.apkUrl) {
      downloadAndInstall();
    }
  }, [updateAvailable, updateInfo, downloadAndInstall]);

  return {
    updateAvailable,
    updateInfo,
    downloading: false,
    downloadProgress: 0,
    error: null,
    checkForUpdates,
    downloadAndInstall,
  };
}
