import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import colors from '@/constants/colors';

type NativePlayerProps = ViewProps & {
  streamUrl: string;
  onStreamError?: (
    event: NativeSyntheticEvent<{ message?: string }>,
  ) => void;
};

let NativePlayer: React.ComponentType<NativePlayerProps> | null = null;
let nativePlayerUnavailable = false;

if (Platform.OS === 'android') {
  try {
    NativePlayer = requireNativeViewManager<NativePlayerProps>('IptvPlayer');
  } catch {
    nativePlayerUnavailable = true;
  }
}

type Props = {
  streamUrl: string;
  onError: (message: string) => void;
};

export default function PlayerSurface({ streamUrl, onError }: Props) {
  if (Platform.OS === 'android' && NativePlayer) {
    return (
      <NativePlayer
        style={StyleSheet.absoluteFill}
        streamUrl={streamUrl}
        onStreamError={(event) =>
          onError(
            event.nativeEvent.message ??
              'The stream could not be received. Check the TV network.',
          )
        }
      />
    );
  }

  const message = nativePlayerUnavailable
    ? 'Install the Android TV build to play multicast video.'
    : 'Multicast playback is available on the Android TV build.';

  return (
    <View style={styles.preview}>
      <View style={styles.playMark}>
        <Text style={styles.playTriangle}>▶</Text>
      </View>
      <Text style={styles.previewTitle}>Ready to tune in</Text>
      <Text style={styles.previewCopy}>{message}</Text>
    </View>
  );
}

const theme = colors.dark;

const styles = StyleSheet.create({
  preview: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: theme.playerSurface,
  },
  playMark: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: theme.primary,
    marginBottom: 16,
  },
  playTriangle: {
    color: theme.primaryForeground,
    fontSize: 21,
    marginLeft: 3,
  },
  previewTitle: {
    color: theme.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  previewCopy: {
    color: theme.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 330,
  },
});
