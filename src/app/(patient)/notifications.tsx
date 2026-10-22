// Patient Notification Center (SRS FR-5.1, FR-5.2, FR-5.4)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { mockDomainStore } from '../../mock/mockDomainStore';
import { Card } from '../../components/ui/Card';

export default function NotificationsScreen() {
  const { currentUser } = useAuthStore();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: () => mockDomainStore.getNotificationsForUser(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const handleNotificationPress = (notif: any) => {
    mockDomainStore.markNotificationAsRead(notif.id);
    refetch();

    if (notif.referenceId) {
      if (notif.type === 'result_ready') {
        router.push(`/(patient)/result/${notif.referenceId}` as any);
      } else {
        router.push(`/(patient)/visit/${notif.referenceId}` as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card
            style={!item.isRead ? styles.cardUnread : styles.card}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                {!item.isRead && <View style={styles.unreadDot} />}
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Text style={styles.date}>{item.createdAt.split('T')[0]}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={36} color={THEME.colors.primary} />
            </View>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    padding: THEME.spacing.base,
  },
  card: {
    marginBottom: 10,
    backgroundColor: THEME.colors.surface,
  },
  cardUnread: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: '#99F6E4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  date: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  body: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
});
