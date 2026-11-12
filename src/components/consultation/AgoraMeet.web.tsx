// Web host for the Agora meeting surface: a same-page iframe with camera/microphone
// permission delegated to the room (the Agora Web SDK runs inside it).
import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface AgoraMeetProps {
  html: string;
  onMessage: (message: Record<string, any>) => void;
}

export function AgoraMeet({ html, onMessage }: AgoraMeetProps) {
  React.useEffect(() => {
    const target = globalThis as any;
    if (!target.addEventListener) return undefined;
    const handler = (event: any) => {
      const data = event && event.data;
      if (data && data.source === 'homecare-meeting') onMessage(data);
    };
    target.addEventListener('message', handler);
    return () => target.removeEventListener('message', handler);
  }, [onMessage]);

  const frame = React.useMemo(
    () =>
      React.createElement('iframe' as any, {
        srcDoc: html,
        title: 'HomeCare video consultation',
        allow: 'camera; microphone; autoplay; fullscreen; display-capture',
        allowFullScreen: true,
        style: {
          border: 'none',
          width: '100%',
          height: '100%',
          backgroundColor: '#202124',
        },
      }),
    [html]
  );

  return <View style={styles.fill}>{frame}</View>;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#202124',
  },
});
