// Native (iOS/Android) host for the Agora meeting surface: a WebView that runs the
// Agora Web SDK, so the exact same Meet-style room is used on every platform.
import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface AgoraMeetProps {
  html: string;
  onMessage: (message: Record<string, any>) => void;
}

export function AgoraMeet({ html, onMessage }: AgoraMeetProps) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.fill}
      containerStyle={styles.fill}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      setSupportMultipleWindows={false}
      onMessage={(event) => {
        try {
          const parsed = JSON.parse(event.nativeEvent.data);
          if (parsed && parsed.source === 'homecare-meeting') onMessage(parsed);
        } catch {
          // ignore non-JSON bridge traffic
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#202124',
  },
});
