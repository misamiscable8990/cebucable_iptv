import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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

const STORAGE_KEY = 'iptv:last-channel';
const theme = colors.dark;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const wideLayout = width > height || width >= 760;
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);

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
        setCurrentId(savedChannel?.id ?? channels[0]?.id ?? null);
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

  const chooseChannel = useCallback(async (channel: Channel) => {
    setCurrentId(channel.id);
    setPlaybackError(null);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, channel.id);
      setSaveWarning(false);
    } catch {
      setSaveWarning(true);
    }
  }, []);

  const renderChannel = useCallback(
    ({ item }: { item: Channel }) => {
      const isPlaying = item.id === currentChannel?.id;
      const isFocused = item.id === focusedId;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Channel ${item.number}, ${item.name}${isPlaying ? ', selected' : ''}`}
          focusable
          onFocus={() => setFocusedId(item.id)}
          onPress={() => void chooseChannel(item)}
          style={[
            styles.channelRow,
            isPlaying && styles.channelRowPlaying,
            isFocused && styles.channelRowFocused,
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
          {isPlaying ? (
            <View style={styles.selectedDot} />
          ) : (
            <Feather name="chevron-right" size={16} color={theme.mutedForeground} />
          )}
        </Pressable>
      );
    },
    [chooseChannel, currentChannel?.id, focusedId],
  );

  const webInsets = Platform.OS === 'web';

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: webInsets ? 70 : 24,
          paddingBottom: webInsets ? 34 : 24,
          paddingHorizontal: wideLayout ? 36 : 18,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Feather name="radio" size={18} color={theme.primaryForeground} />
          </View>
          <Text style={styles.brandName}>IPTV</Text>
          <View style={styles.headerDivider} />
          <Text style={styles.headerSection}>LIVE TV</Text>
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.liveDot} />
          <Text style={styles.headerMetaText}>60 CHANNELS</Text>
        </View>
      </View>

      <View
        style={[
          styles.main,
          {
            flexDirection: wideLayout ? 'row' : 'column',
            gap: wideLayout ? 20 : 14,
          },
        ]}
      >
        <View
          style={[
            styles.playerColumn,
            wideLayout ? { flex: 1.7 } : { height: Math.min(height * 0.36, 310) },
          ]}
        >
          <View style={styles.playerFrame}>
            {currentChannel ? (
              <PlayerSurface
                streamUrl={currentChannel.url}
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

          <View style={styles.nowPlaying}>
            <View style={styles.nowPlayingInfo}>
              <View style={styles.nowPlayingEyebrow}>
                <View style={styles.livePill}>
                  <View style={styles.livePillDot} />
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
                <Text style={styles.nowPlayingChannel}>
                  {currentChannel
                    ? `CH ${String(currentChannel.number).padStart(2, '0')}`
                    : 'STARTING'}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.nowPlayingName}>
                {restoring
                  ? 'Tuning to your channel'
                  : (currentChannel?.name ?? 'No channel available')}
              </Text>
              <Text numberOfLines={1} style={styles.streamAddress}>
                {currentChannel?.url ?? 'Waiting for the channel list'}
              </Text>
            </View>
            <View style={styles.feedBadge}>
              <Feather name="radio" size={15} color={theme.primary} />
              <Text style={styles.feedBadgeText}>UDP</Text>
            </View>
          </View>
        </View>

        <View style={[styles.guide, wideLayout ? { flex: 1 } : { flex: 1 }]}>
          <View style={styles.guideHeader}>
            <View>
              <Text style={styles.guideTitle}>CHANNEL GUIDE</Text>
              <Text style={styles.guideSubtitle}>Choose a channel to start watching</Text>
            </View>
            <Text style={styles.guideCount}>60</Text>
          </View>
          <FlatList
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelList}
          />
          <View style={styles.guideFooter}>
            <Feather name="corner-down-right" size={14} color={theme.mutedForeground} />
            <Text style={styles.guideFooterText}>
              Use the remote to browse and select
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GELOBOT TV PLAYLIST</Text>
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
  headerDivider: {
    width: 1,
    height: 21,
    backgroundColor: theme.border,
    marginHorizontal: 5,
  },
  headerSection: {
    color: theme.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.3,
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
  nowPlayingEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.liveBadge,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  livePillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.destructive,
  },
  livePillText: {
    color: theme.destructive,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  nowPlayingChannel: {
    color: theme.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nowPlayingName: {
    color: theme.foreground,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  streamAddress: {
    color: theme.mutedForeground,
    fontSize: 11,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  feedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedBadgeText: {
    color: theme.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
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
});
