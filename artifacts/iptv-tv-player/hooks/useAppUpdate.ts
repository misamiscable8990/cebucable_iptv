import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';

export type UpdateInfo = {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes?: string;
};

const GITHUB_VERSION_URL = 'https://raw.githubusercontent.com/misamiscable8990/cebucable_iptv/main/version.json';
export const CURRENT_VERSION = '1.0.23';
export const CURRENT_VERSION_CODE = 24;

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const checkForUpdates = useCallback(async (): Promise<UpdateInfo | null> => {
    if (Platform.OS !== 'android') return null;
    try {
      const response = await fetch(GITHUB_VERSION_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const remoteData: UpdateInfo = await response.json();

      if (
        remoteData.versionCode > CURRENT_VERSION_CODE ||
        remoteData.version > CURRENT_VERSION
      ) {
        setUpdateInfo(remoteData);
        setUpdateAvailable(true);
        return remoteData;
      } else {
        setUpdateInfo(remoteData);
        return remoteData;
      }
    } catch (err: any) {
      console.log('Update check failed:', err?.message);
      return null;
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const downloadAndInstall = useCallback(async (customInfo?: UpdateInfo | null) => {
    const info = customInfo ?? updateInfo;
    const url = info?.apkUrl || 'https://github.com/misamiscable8990/cebucable_iptv/releases/latest';
    try {
      setUpdating(true);
      setUpdateStatus('Initiating app update...');
      await Linking.openURL(url);
    } catch (err: any) {
      setUpdateStatus('Failed to open update URL');
      console.log('Failed to open update URL:', err?.message);
    } finally {
      setTimeout(() => {
        setUpdating(false);
        setUpdateStatus(null);
      }, 5000);
    }
  }, [updateInfo]);

  const triggerAppUpdate = useCallback(async () => {
    setUpdating(true);
    setUpdateStatus('Checking for app updates...');
    const latestInfo = await checkForUpdates();
    await downloadAndInstall(latestInfo);
  }, [checkForUpdates, downloadAndInstall]);

  return {
    updateAvailable,
    updateInfo,
    updating,
    updateStatus,
    downloading: false,
    downloadProgress: 0,
    error: null,
    checkForUpdates,
    downloadAndInstall,
    triggerAppUpdate,
  };
}
