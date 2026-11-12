// Online Video Consultation Room (Agora RTC) — Google Meet style meeting surface
// shared by doctors and patients of the same visit.
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AGORA_CONFIG } from '../../constants/agora';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { agoraChannelForVisit, agoraUidFromUserId, buildRtcToken } from '../../services/agoraToken';
import { buildMeetingHtml } from '../../components/consultation/meetingHtml';
import { AgoraMeet } from '../../components/consultation/AgoraMeet';
import { Button } from '../../components/ui/Button';

function meetingCodeFor(channel: string): string {
  const compact = channel.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const first = compact.slice(-6, -3) || 'HCR';
  const second = compact.slice(-3) || 'OOM';
  return `HC-${first}-${second}`;
}

export default function OnlineConsultationScreen() {
  const params = useLocalSearchParams<{ visitId: string }>();
  const visitId = (Array.isArray(params.visitId) ? params.visitId[0] : params.visitId) || '';
  const { currentUser } = useAuthStore();

  const { data: visit } = useQuery({
    queryKey: ['visit-details', visitId],
    queryFn: () => patientService.getVisitDetails(visitId),
    enabled: !!visitId,
  });

  const userId = currentUser?.id || '';
  const userName = currentUser?.name || 'Guest';
  const userRole = currentUser?.role || 'patient';
  const isDoctor = userRole === 'doctor';

  const peerName = isDoctor
    ? visit?.patientName || 'Patient'
    : visit?.doctorName || 'Your specialist';

  const html = useMemo(() => {
    if (!userId || !visitId) return '';
    const channel = agoraChannelForVisit(visitId);
    const uid = agoraUidFromUserId(userId);
    const token = buildRtcToken({
      appId: AGORA_CONFIG.appId,
      appCertificate: AGORA_CONFIG.appCertificate,
      channelName: channel,
      uid,
      expireSeconds: AGORA_CONFIG.tokenTtlSeconds,
    });

    return buildMeetingHtml({
      appId: AGORA_CONFIG.appId,
      channel,
      token,
      uid,
      displayName: userName,
      roleLabel: isDoctor ? 'Doctor' : 'Patient',
      peerName,
      peerRoleLabel: isDoctor ? 'Patient' : 'Doctor',
      meetingTitle: `Consultation with ${peerName}`,
      meetingCode: meetingCodeFor(channel),
    });
  }, [userId, userName, isDoctor, peerName, visitId]);

  const handleMessage = useCallback(
    (message: Record<string, any>) => {
      if (message.type !== 'leave') return;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace((isDoctor ? '/(doctor)' : '/(patient)') as any);
      }
    },
    [isDoctor]
  );

  if (!currentUser) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Sign in to join the consultation</Text>
        <Text style={styles.fallbackText}>
          The video room is private to the doctor and patient of this visit.
        </Text>
        <Button title="Back to sign in" onPress={() => router.replace('/(auth)/welcome')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AgoraMeet html={html} onMessage={handleMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202124',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
    gap: 12,
    backgroundColor: THEME.colors.background,
  },
  fallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
});
