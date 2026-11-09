import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  DeviceEventEmitter,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import PlayerSurface from '@/components/PlayerSurface';
import colors from '@/constants/colors';
import { channels, type Channel } from '@/data/channels';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useKeepAwake } from 'expo-keep-awake';

const STORAGE_KEY = 'iptv:last-channel';
const REMOTE_KEY_EVENT = 'AndroidTVRemoteKey';
const DOUBLE_SELECT_WINDOW_MS = 1600;
const theme = colors.dark;

function digitForRemoteKey(keyCode: number): string | null {
  if (keyCode >= 7 && keyCode <= 16) return String(keyCode - 7);
  if (keyCode >= 144 && keyCode <= 153) return String(keyCode - 144);
  return null;
}

function webKeyCode(key: string): number | null {
  if (/^[0-9]$/.test(key)) return 7 + Number(key);
  const keys: Record<string, number> = {
    ArrowUp: 19,
    ArrowDown: 20,
    ArrowLeft: 21,
    ArrowRight: 22,
    Enter: 23,
    ' ': 23,
    PageUp: 166,
    PageDown: 167,
  };
  return keys[key] ?? null;
}

export default function HomeScreen() {
  useKeepAwake();
  const { updateAvailable, updateInfo, downloading, downloadProgress, downloadAndInstall } = useAppUpdate();
  const { width, height } = useWindowDimensions();
  const wideLayout = width > height || width >= 760;
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [numberInput, setNumberInput] = useState('');
  const [invalidNumber, setInvalidNumber] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);
  const listRef = useRef<FlatList<Channel> | null>(null);
  const pendingPressRef = useRef<{ channelId: string; at: number } | null>(null);
  const pendingPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberInputRef = useRef('');
  const numberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    const restoreChannel = async () => {
      let savedId: string | null = null;
      try {
        savedId = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        if (active) setSaveWarning(true);
      }

      if (active) {
        const savedChannel = channels.find((channel) => channel.id === savedId);
        const initialChannel = savedChannel ?? channels[0];
        setCurrentId(initialChannel?.id ?? null);
        setSelectedId(initialChannel?.id ?? null);
        setSelectedIndex(Math.max(0, (initialChannel?.number ?? 1) - 1));
        setRestoring(false);
      }
    };

    void restoreChannel();
    return () => {
      active = false;
    };
  }, []);

  const currentChannel = useMemo(
    () => channels.find((channel) => channel.id === currentId) ?? channels[0],
    [currentId],
  );

  const cancelPendingPress = useCallback(() => {
    pendingPressRef.current = null;
    if (pendingPressTimerRef.current) {
      clearTimeout(pendingPressTimerRef.current);
      pendingPressTimerRef.current = null;
    }
    setPendingConfirmId(null);
  }, []);

  const commitChannel = useCallback((channel: Channel) => {
    setCurrentId(channel.id);
    setSelectedId(channel.id);
    setSelectedIndex(channel.number - 1);
    setGuideOpen(false);
    setPlaybackError(null);
    setInvalidNumber(false);
    cancelPendingPress();
    numberInputRef.current = '';
    setNumberInput('');
    if (numberTimerRef.current) {
      clearTimeout(numberTimerRef.current);
      numberTimerRef.current = null;
    }
    void AsyncStorage.setItem(STORAGE_KEY, channel.id)
      .then(() => setSaveWarning(false))
      .catch(() => setSaveWarning(true));
  }, [cancelPendingPress]);

  const handleChannelPress = useCallback((channel: Channel) => {
    const now = Date.now();
    const lastPress = pendingPressRef.current;
    setSelectedId(channel.id);
    setSelectedIndex(channel.number - 1);

    if (
      lastPress?.channelId === channel.id &&
      now - lastPress.at <= DOUBLE_SELECT_WINDOW_MS
    ) {
      commitChannel(channel);
      return;
    }

    pendingPressRef.current = { channelId: channel.id, at: now };
    setPendingConfirmId(channel.id);
    if (pendingPressTimerRef.current) {
      clearTimeout(pendingPressTimerRef.current);
    }
    pendingPressTimerRef.current = setTimeout(() => {
      pendingPressRef.current = null;
      setPendingConfirmId((pendingId) =>
        pendingId === channel.id ? null : pendingId,
      );
    }, DOUBLE_SELECT_WINDOW_MS);
  }, [commitChannel]);

  const openGuide = useCallback(() => {
    if (currentChannel) {
      setSelectedId(currentChannel.id);
      setSelectedIndex(currentChannel.number - 1);
    }
    cancelPendingPress();
    setGuideOpen(true);
  }, [cancelPendingPress, currentChannel]);

  const moveSelection = useCallback((step: number) => {
    const nextIndex = Math.max(
      0,
      Math.min(channels.length - 1, selectedIndex + step),
    );
    const nextChannel = channels[nextIndex];
    if (!nextChannel) return;
    setSelectedIndex(nextIndex);
    setSelectedId(nextChannel.id);
    cancelPendingPress();
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        listRef.current?.scrollToOffset({
          offset: nextIndex * 57,
          animated: true,
        });
      }
    });
  }, [cancelPendingPress, selectedIndex]);

  const appendChannelDigit = useCallback((digit: string) => {
    const nextInput = `${numberInputRef.current}${digit}`.slice(-2);
    numberInputRef.current = nextInput;
    setNumberInput(nextInput);
    setInvalidNumber(false);
    cancelPendingPress();
    if (numberTimerRef.current) clearTimeout(numberTimerRef.current);

    numberTimerRef.current = setTimeout(() => {
      const channelNumber = Number(numberInputRef.current);
      const channel = channels[channelNumber - 1];
      if (channel) {
        commitChannel(channel);
        return;
      }
      setInvalidNumber(true);
      numberTimerRef.current = setTimeout(() => {
        numberInputRef.current = '';
        setNumberInput('');
        setInvalidNumber(false);
        numberTimerRef.current = null;
      }, 1500);
    }, 3000);
  }, [cancelPendingPress, commitChannel]);

  const handleRemoteKey = useCallback((keyCode: number) => {
    const digit = digitForRemoteKey(keyCode);
    if (digit !== null) {
      appendChannelDigit(digit);
      return;
    }

    if (keyCode === 20 || keyCode === 167) {
      if (guideOpen) moveSelection(1);
      else openGuide();
      return;
    }

    if (keyCode === 19 || keyCode === 166) {
      if (guideOpen) moveSelection(-1);
      else openGuide();
      return;
    }

    if ((keyCode === 23 || keyCode === 66 || keyCode === 160) && guideOpen) {
      const channel = channels[selectedIndex];
      if (channel) handleChannelPress(channel);
    }
  }, [
    appendChannelDigit,
    guideOpen,
    handleChannelPress,
    moveSelection,
    openGuide,
    selectedIndex,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = DeviceEventEmitter.addListener(
      REMOTE_KEY_EVENT,
      (keyCode: number) => handleRemoteKey(keyCode),
    );
    return () => subscription.remove();
  }, [handleRemoteKey]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const keyCode = webKeyCode(event.key);
      if (keyCode === null) return;
      event.preventDefault();
      event.stopPropagation();
      handleRemoteKey(keyCode);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [handleRemoteKey]);

  useEffect(() => {
    if (!guideOpen) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        cancelPendingPress();
        setGuideOpen(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [cancelPendingPress, guideOpen]);

  useEffect(() => () => {
    if (pendingPressTimerRef.current) clearTimeout(pendingPressTimerRef.current);
    if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
  }, []);

  const renderChannel = useCallback(
    ({ item }: { item: Channel }) => {
      const isPlaying = item.id === currentChannel?.id;
      const isFocused = item.id === focusedId;
      const isSelected = item.id === selectedId;
      const needsConfirm = item.id === pendingConfirmId;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Channel ${item.number}, ${item.name}${isSelected ? ', selected' : ''}${needsConfirm ? ', select again to play' : ''}`}
          focusable
          onFocus={() => {
            setFocusedId(item.id);
            setSelectedId(item.id);
            setSelectedIndex(item.number - 1);
          }}
          onPress={() => handleChannelPress(item)}
          style={[
            styles.channelRow,
            isPlaying && styles.channelRowPlaying,
            (isFocused || isSelected) && styles.channelRowFocused,
          ]}
          testID={`channel-${item.number}`}
        >
          <Text style={[styles.channelNumber, isPlaying && styles.playingText]}>
            {String(item.number).padStart(2, '0')}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.channelName, isPlaying && styles.playingText]}
          >
            {item.name}
          </Text>
          {needsConfirm ? (
            <Text style={styles.confirmHint}>OK AGAIN</Text>
          ) : isSelected || isPlaying ? (
            <View style={styles.selectedDot} />
          ) : (
            <Feather name="chevron-right" size={16} color={theme.mutedForeground} />
          )}
        </Pressable>
      );
    },
    [currentChannel?.id, focusedId, handleChannelPress, pendingConfirmId, selectedId],
  );

  const webInsets = Platform.OS === 'web';
  const guideModePadding = {
    paddingTop: webInsets ? 70 : 24,
    paddingBottom: webInsets ? 34 : 24,
    paddingHorizontal: wideLayout ? 36 : 18,
  };

  return (
    <View
      style={[
        styles.screen,
        guideOpen ? guideModePadding : styles.fullscreenScreen,
      ]}
    >
      {updateAvailable && (
        <View style={styles.updateBanner}>
          <Feather name="download-cloud" size={16} color={theme.primaryForeground} />
          <Text style={styles.updateText}>
            Update available: v{updateInfo?.version} {downloading ? `(${Math.round(downloadProgress * 100)}%)` : ''}
          </Text>
          <Pressable style={styles.updateButton} onPress={downloadAndInstall}>
            <Text style={styles.updateButtonText}>{downloading ? 'Downloading...' : 'Update Now'}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.header, !guideOpen && styles.hidden]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Feather name="radio" size={18} color={theme.primaryForeground} />
          </View>
          <Text style={styles.brandName}>CEBU CABLE IPTV</Text>
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.liveDot} />
          <Text style={styles.headerMetaText}>{channels.length} CHANNELS</Text>
        </View>
      </View>

      <View
        style={[
          styles.main,
          {
            flexDirection: guideOpen && !wideLayout ? 'column' : 'row',
            gap: guideOpen ? (wideLayout ? 20 : 14) : 0,
          },
        ]}
      >
        <View
          style={[
            styles.playerColumn,
            guideOpen
              ? wideLayout
                ? { flex: 1.7 }
                : { height: Math.min(height * 0.36, 310) }
              : styles.fullscreenPlayerColumn,
          ]}
        >
          <View
            style={[
              styles.playerFrame,
              !guideOpen && styles.fullscreenPlayerFrame,
            ]}
          >
            {currentChannel ? (
              <PlayerSurface
                streamUrl={currentChannel.url}
                remoteEnabled={!guideOpen}
                onError={setPlaybackError}
              />
            ) : null}
            {playbackError ? (
              <View style={styles.errorOverlay}>
                <Feather name="wifi-off" size={23} color={theme.destructive} />
                <Text style={styles.errorTitle}>Stream unavailable</Text>
                <Text style={styles.errorCopy}>{playbackError}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.nowPlaying, !guideOpen && styles.hidden]}>
            <View style={styles.nowPlayingInfo}>
              <Text style={styles.nowPlayingChannel}>
                {currentChannel
                  ? `CH ${String(currentChannel.number).padStart(2, '0')}`
                  : 'STARTING'}
              </Text>
              <Text numberOfLines={1} style={styles.nowPlayingName}>
                {restoring
                  ? 'Tuning to your channel'
                  : (currentChannel?.name ?? 'No channel available')}
              </Text>
            </View>
          </View>

          {numberInput || invalidNumber ? (
            <View pointerEvents="none" style={styles.numberEntry}>
              <Text style={styles.numberEntryValue}>
                {invalidNumber ? numberInput : `CH ${numberInput}`}
              </Text>
              <Text style={styles.numberEntryLabel}>
                {invalidNumber ? 'CHANNEL NOT FOUND' : 'TUNING IN'}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.guide,
            !guideOpen && styles.hidden,
            wideLayout ? { flex: 1 } : { flex: 1 },
          ]}
        >
          <View style={styles.guideHeader}>
            <View>
              <Text style={styles.guideTitle}>CHANNEL GUIDE</Text>
              <Text style={styles.guideSubtitle}>
                Select a channel twice to return to full screen
              </Text>
            </View>
            <Text style={styles.guideCount}>{channels.length}</Text>
          </View>
          <FlatList
            ref={listRef}
            data={channels}
            keyExtractor={(item) => item.id}
            renderItem={renderChannel}
            initialNumToRender={12}
            windowSize={9}
            maxToRenderPerBatch={12}
            getItemLayout={(_, index) => ({
              length: 57,
              offset: 57 * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({
                offset: index * 57,
                animated: true,
              });
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelList}
          />
          <View style={styles.guideFooter}>
            <Feather name="corner-down-right" size={14} color={theme.mutedForeground} />
            <Text style={styles.guideFooterText}>
              Use arrows to browse · press OK twice to watch
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, !guideOpen && styles.hidden]}>
        <Text style={styles.footerNetwork}>
          {saveWarning
            ? 'LAST CHANNEL COULD NOT BE SAVED'
            : 'SAME LOCAL NETWORK REQUIRED'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  fullscreenScreen: {
    padding: 0,
  },
  hidden: {
    display: 'none',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: theme.foreground,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  headerMetaText: {
    color: theme.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  main: {
    flex: 1,
    minHeight: 0,
  },
  playerColumn: {
    minHeight: 0,
    position: 'relative',
  },
  fullscreenPlayerColumn: {
    flex: 1,
  },
  playerFrame: {
    flex: 1,
    minHeight: 150,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: theme.playerBlack,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fullscreenPlayerFrame: {
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.scrim,
  },
  errorTitle: {
    color: theme.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  errorCopy: {
    color: theme.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 350,
  },
  nowPlaying: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  nowPlayingInfo: {
    flex: 1,
    paddingRight: 12,
  },
  nowPlayingChannel: {
    color: theme.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },
  nowPlayingName: {
    color: theme.foreground,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  numberEntry: {
    position: 'absolute',
    top: 28,
    right: 28,
    alignItems: 'flex-end',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  numberEntryValue: {
    color: theme.foreground,
    fontSize: 25,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  numberEntryLabel: {
    color: theme.mutedForeground,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 3,
  },
  guide: {
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 8,
  },
  guideHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 9,
  },
  guideTitle: {
    color: theme.foreground,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  guideSubtitle: {
    color: theme.mutedForeground,
    fontSize: 10,
    marginTop: 5,
  },
  guideCount: {
    color: theme.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
    paddingTop: 1,
  },
  channelList: {
    paddingBottom: 6,
  },
  channelRow: {
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: theme.secondary,
  },
  channelRowPlaying: {
    backgroundColor: theme.selectedChannel,
    borderColor: theme.selectedChannelBorder,
  },
  channelRowFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.selectedChannelFocused,
  },
  channelNumber: {
    width: 26,
    color: theme.mutedForeground,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  channelName: {
    flex: 1,
    color: theme.secondaryForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  playingText: {
    color: theme.primary,
  },
  selectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginHorizontal: 4,
  },
  confirmHint: {
    color: theme.primary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guideFooter: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 2,
  },
  guideFooterText: {
    color: theme.mutedForeground,
    fontSize: 10,
  },
  footer: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  footerText: {
    color: theme.mutedForeground,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  footerNetwork: {
    color: theme.mutedForeground,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  updateBanner: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  updateText: {
    color: theme.primaryForeground,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  updateButton: {
    backgroundColor: theme.foreground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButtonText: {
    color: theme.background,
    fontSize: 12,
    fontWeight: '700',
  },
});
