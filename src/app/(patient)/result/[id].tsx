// Result Document Details, Fictional PDF Viewer & Offline Cache (SRS FR-7.3, NFR-8.2, NFR-9.2)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../../constants/theme';
import { patientService } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ['result-document', id],
    queryFn: () => patientService.getResultDocument(id || ''),
    enabled: !!id,
  });

  if (isLoading || !result) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Opening laboratory report...</Text>
      </View>
    );
  }

  const handleDownloadOffline = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setIsDownloaded(true);
      alert(`Report "${result.pdfFileName}" saved to local offline storage cache.`);
    }, 800);
  };

  const handleShare = () => {
    alert(`System share sheet opened for: ${result.pdfFileName}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Result Metadata Banner */}
      <View style={styles.metaBanner}>
        <View style={styles.tagRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OFFICIAL MEDICAL EXAMINATION</Text>
          </View>
          {isDownloaded && (
            <View style={styles.cachedBadge}>
              <Text style={styles.cachedText}>✓ AVAILABLE OFFLINE</Text>
            </View>
          )}
        </View>

        <Text style={styles.resultTitle}>{result.title}</Text>
        <Text style={styles.resultDate}>Validated & Published: {result.publishedAt}</Text>
      </View>

      {/* Traceability Metadata Card (SRS NFR-9.2) */}
      <Card style={styles.traceCard}>
        <Text style={styles.traceHeader}>Specimen Traceability Verification</Text>
        <View style={styles.traceRow}>
          <Text style={styles.traceLabel}>Patient Full Name:</Text>
          <Text style={styles.traceVal}>{result.patientName}</Text>
        </View>
        <View style={styles.traceRow}>
          <Text style={styles.traceLabel}>Attending Specialist:</Text>
          <Text style={styles.traceVal}>{result.doctorName}</Text>
        </View>
        <View style={styles.traceRow}>
          <Text style={styles.traceLabel}>Visit Reference:</Text>
          <Text style={styles.traceVal}>#{result.visitId.toUpperCase()}</Text>
        </View>
        {result.sampleId && (
          <View style={styles.traceRow}>
            <Text style={styles.traceLabel}>Sample Tracking ID:</Text>
            <Text style={styles.traceVal}>#{result.sampleId.toUpperCase()}</Text>
          </View>
        )}
      </Card>

      {/* Examination Summary Findings */}
      <Card style={styles.findingsCard}>
        <Text style={styles.findingsHeader}>Diagnostic Findings & Observations</Text>
        <Text style={styles.findingsBody}>{result.summaryFindings}</Text>
      </Card>

      {/* Bundled Fictional PDF Document Canvas Preview */}
      <View style={styles.pdfCanvas}>
        <View style={styles.pdfPage}>
          <View style={styles.pdfHeader}>
            <Text style={styles.pdfWatermark}>RWANDA BIOMEDICAL CONSULTATION SERVICE</Text>
            <Text style={styles.pdfDocNum}>{result.pdfFileName}</Text>
          </View>
          <View style={styles.pdfBody}>
            <Text style={styles.pdfHeadline}>CONFIDENTIAL MEDICAL REPORT</Text>
            <Text style={styles.pdfLine}>Patient ID: {result.patientId}</Text>
            <Text style={styles.pdfLine}>Collection Date: 2026-10-20 (Residence)</Text>
            <Text style={styles.pdfLine}>Processed at: Kigali Central Biomedical Lab</Text>
            <View style={styles.pdfSeparator} />
            <Text style={styles.pdfLine}>Summary: {result.summaryFindings}</Text>
            <View style={styles.pdfSeparator} />
            <Text style={styles.pdfSignature}>Electronically Validated by: {result.doctorName}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons: Download PDF and Share */}
      <View style={styles.actionRow}>
        <Button
          title={isDownloaded ? 'Downloaded (Offline Ready)' : 'Download PDF for Offline'}
          variant={isDownloaded ? 'secondary' : 'primary'}
          onPress={handleDownloadOffline}
          loading={downloading}
          style={{ flex: 1 }}
        />
        <Button
          title="Share"
          variant="outline"
          onPress={handleShare}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  metaBanner: {
    marginBottom: THEME.spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  cachedBadge: {
    backgroundColor: THEME.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cachedText: {
    color: THEME.colors.success,
    fontSize: 9,
    fontWeight: '800',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  resultDate: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  traceCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  traceHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  traceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  traceLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  traceVal: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  findingsCard: {
    marginBottom: THEME.spacing.md,
  },
  findingsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  findingsBody: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  pdfCanvas: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  pdfPage: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 4,
    minHeight: 220,
  },
  pdfHeader: {
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  pdfWatermark: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  pdfDocNum: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  pdfBody: {
    gap: 4,
  },
  pdfHeadline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pdfLine: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  pdfSeparator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  pdfSignature: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
