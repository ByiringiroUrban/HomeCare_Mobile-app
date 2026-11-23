// Mobile money payment for a visit, collected through PawaPay (SRS FR-8.2)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { formatMoney } from '../../../utils/money';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { paymentService, PaymentRecord } from '../../../services/payments';

const FINAL_STATUSES = ['COMPLETED', 'FAILED', 'REJECTED'];

export default function PayVisitScreen() {
  const params = useLocalSearchParams<{
    visitId: string;
    amount: string;
    currency: string;
    phone: string;
    method: string;
    doctorName: string;
  }>();

  const visitId = params.visitId || '';
  const amount = Number(params.amount) || 0;
  const currency = (params.currency || 'RWF').toUpperCase();
  const phone = params.phone || '';

  const queryClient = useQueryClient();
  const [providerOverride, setProviderOverride] = useState('');
  const [deposit, setDeposit] = useState<PaymentRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const configQuery = useQuery({
    queryKey: ['payment-config', currency],
    queryFn: () => paymentService.getProviders(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const options = useMemo(
    () =>
      (configQuery.data?.providers || []).filter(
        (p) => (p.currency || '').toUpperCase() === currency
      ),
    [configQuery.data, currency]
  );

  // Default to the provider that matches the chosen method, no effect needed
  const provider = useMemo(() => {
    if (providerOverride) return providerOverride;
    if (options.length === 0) return '';
    const preferred =
      params.method === 'airtel'
        ? options.find((o) => /airtel/i.test(o.displayName))
        : options.find((o) => /mtn/i.test(o.displayName));
    return (preferred || options.find((o) => o.status === 'OPERATIONAL') || options[0]).provider;
  }, [providerOverride, options, params.method]);

  const initiate = useMutation({
    mutationFn: () =>
      paymentService.initiateDeposit({
        amount,
        currency,
        phoneNumber: phone,
        provider,
        reference: visitId || undefined,
        visitId: visitId || undefined,
        customerMessage: 'HomeCare consultation',
      }),
    onSuccess: (record) => {
      setDeposit(record);
      setErrorMsg(record.message || '');
    },
    onError: (err: any) => setErrorMsg(err.message || 'Could not start the payment.'),
  });

  const statusQuery = useQuery({
    queryKey: ['payment-status', deposit?.depositId],
    queryFn: () => paymentService.getStatus(deposit!.depositId),
    enabled: !!deposit && !FINAL_STATUSES.includes(deposit.status),
    refetchInterval: (query) => {
      const current = query.state.data?.status;
      return current && FINAL_STATUSES.includes(current) ? false : 4000;
    },
  });

  const current: PaymentRecord | null = statusQuery.data ?? deposit;
  const status = current?.status || '';
  const isFinal = FINAL_STATUSES.includes(status);

  // The backend mirrors the deposit status onto the visit; refresh the cached copy
  useEffect(() => {
    if (!visitId || !isFinal) return;
    queryClient.invalidateQueries({ queryKey: ['visit-details', visitId] });
    queryClient.invalidateQueries({ queryKey: ['patient-visits'] });
    queryClient.invalidateQueries({ queryKey: ['patient-dashboard'] });
  }, [isFinal, visitId, queryClient]);

  const configMessage = configQuery.data?.message;
  const notEnabled = configQuery.data?.enabled === false;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pay for Consultation</Text>
        <Text style={styles.subtitle}>{params.doctorName || 'Home visit'}</Text>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Visit fee</Text>
          <Text style={styles.rowValue}>{formatMoney(amount, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Mobile money</Text>
          <Text style={styles.rowValue}>{phone || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Environment</Text>
          <Text style={[styles.rowValue, styles.envText]}>
            {(configQuery.data?.environment || 'sandbox').toUpperCase()}
          </Text>
        </View>
      </Card>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {!deposit ? (
        <>
          <Text style={styles.sectionTitle}>Choose your mobile money provider</Text>

          {configQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Loading providers…</Text>
            </View>
          ) : null}

          {configQuery.isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Could not load mobile money providers: {(configQuery.error as Error)?.message}
              </Text>
              <Text style={styles.errorHint}>
                Sign in with your registered account, then try again.
              </Text>
            </View>
          ) : null}

          {!configQuery.isLoading && (notEnabled || configMessage) ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Payments not available yet</Text>
              <Text style={styles.noticeText}>{configMessage}</Text>
              <Text style={styles.noticeText}>
                You can still confirm the visit and pay cash on arrival.
              </Text>
            </View>
          ) : null}

          <View style={styles.providerList}>
            {options.map((option) => {
              const isSelected = provider === option.provider;
              return (
                <Pressable
                  key={`${option.provider}-${option.currency}`}
                  onPress={() => setProviderOverride(option.provider)}
                  style={[styles.providerChip, isSelected && styles.providerChipActive]}
                >
                  <Text style={[styles.providerText, isSelected && styles.providerTextActive]}>
                    {option.displayName}
                  </Text>
                  {option.status !== 'OPERATIONAL' ? (
                    <Text style={styles.providerStatus}>Unavailable</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Button
            title={amount > 0 ? `Send ${formatMoney(amount, currency)} Payment Prompt` : 'Send Payment Prompt'}
            onPress={() => {
              setErrorMsg('');
              initiate.mutate();
            }}
            loading={initiate.isPending}
            disabled={!provider || amount <= 0 || !phone}
            size="lg"
            style={styles.payBtn}
          />

          <Text style={styles.footnote}>
            You will receive a prompt on your phone. Enter your mobile money PIN to approve the
            payment.
          </Text>

          <Button
            title="Pay Cash on Visit Instead"
            variant="ghost"
            onPress={() => router.replace(`/(patient)/visit/${visitId}` as any)}
            style={styles.secondaryBtn}
          />
        </>
      ) : (
        <>
          <Card style={styles.statusCard}>
            {!isFinal ? (
              <>
                <ActivityIndicator color={THEME.colors.primary} />
                <Text style={styles.statusTitle}>Waiting for your approval</Text>
                <Text style={styles.statusText}>
                  Approve the {formatMoney(amount, currency)} prompt on {phone}. This screen updates
                  automatically.
                </Text>
              </>
            ) : status === 'COMPLETED' ? (
              <>
                <Ionicons name="checkmark-circle" size={44} color={THEME.colors.success} />
                <Text style={[styles.statusTitle, { color: THEME.colors.success }]}>
                  Payment received
                </Text>
                <Text style={styles.statusText}>
                  {formatMoney(amount, currency)} paid with {current?.provider}.
                  {current?.providerTransactionId
                    ? ` Receipt: ${current.providerTransactionId}`
                    : ''}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={44} color={THEME.colors.error} />
                <Text style={[styles.statusTitle, { color: THEME.colors.error }]}>
                  Payment not completed
                </Text>
                <Text style={styles.statusText}>
                  {current?.failureMessage || 'The payment was not approved.'}
                  {current?.failureCode ? ` (${current.failureCode})` : ''}
                </Text>
              </>
            )}
          </Card>

          <View style={styles.depositMeta}>
            <Text style={styles.metaText}>Deposit ID: {current?.depositId}</Text>
            <Text style={styles.metaText}>Status: {status}</Text>
          </View>

          {!isFinal ? (
            <Button
              title="Check Status Now"
              variant="secondary"
              onPress={() => statusQuery.refetch()}
              loading={statusQuery.isFetching}
              style={styles.secondaryBtn}
            />
          ) : null}

          {status === 'COMPLETED' ? (
            <Button
              title="Back to Visit"
              size="lg"
              onPress={() => router.replace(`/(patient)/visit/${visitId}` as any)}
              style={styles.payBtn}
            />
          ) : isFinal ? (
            <Button
              title="Try Again"
              size="lg"
              onPress={() => {
                setDeposit(null);
                setErrorMsg('');
              }}
              style={styles.payBtn}
            />
          ) : (
            <Button
              title="Back to Visit"
              variant="secondary"
              onPress={() => router.replace(`/(patient)/visit/${visitId}` as any)}
              style={styles.secondaryBtn}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    flexGrow: 1,
    paddingBottom: 60,
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryCard: {
    marginBottom: THEME.spacing.lg,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  envText: {
    fontSize: 11,
    letterSpacing: 1,
    color: THEME.colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  providerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
  },
  providerChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  providerText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  providerTextActive: {
    color: '#FFF',
  },
  providerStatus: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: THEME.colors.errorSoft,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  errorHint: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  noticeBox: {
    backgroundColor: THEME.colors.primarySoft,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    gap: 4,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: THEME.colors.textSecondary,
  },
  payBtn: {
    marginTop: THEME.spacing.sm,
  },
  secondaryBtn: {
    marginTop: THEME.spacing.sm,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: THEME.colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  statusCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  depositMeta: {
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
});
