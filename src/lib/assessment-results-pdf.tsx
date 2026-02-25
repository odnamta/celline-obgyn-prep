import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export interface AssessmentResultsData {
  orgName: string
  primaryColor?: string
  assessmentTitle: string
  questionCount: number
  timeLimitMinutes: number
  passScore: number
  reportDate: string
  totalAttempts: number
  avgScore: number
  medianScore: number
  passRate: number
  topPerformers: Array<{
    name: string
    score: number
    passed: boolean
  }>
  bottomPerformers: Array<{
    name: string
    score: number
    passed: boolean
  }>
  scoreDistribution: Array<{
    range: string
    count: number
  }>
  questionStats: Array<{
    stem: string
    totalAttempts: number
    percentCorrect: number
  }>
}

const colors = {
  accent: '#1e40af',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  green: '#16a34a',
  red: '#dc2626',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `2px solid ${colors.accent}`,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  reportDate: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.bgLight,
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  // Performers table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bgLight,
    borderBottom: `1px solid ${colors.border}`,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colRank: { width: 30 },
  colName: { flex: 3 },
  colScore: { flex: 1, textAlign: 'center' },
  colStatus: { flex: 1, textAlign: 'center' },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  cellText: {
    fontSize: 9,
    color: colors.textPrimary,
  },
  passedText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.green,
  },
  failedText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.red,
  },
  // Distribution
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  distLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    width: 40,
    textAlign: 'right',
    marginRight: 6,
  },
  distBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: colors.bgLight,
    borderRadius: 2,
  },
  distBar: {
    height: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  distCount: {
    fontSize: 8,
    color: colors.textSecondary,
    width: 24,
    textAlign: 'right',
    marginLeft: 4,
  },
  // Question analysis
  questionRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colStem: { flex: 4 },
  colAttempts: { flex: 1, textAlign: 'center' },
  colCorrect: { flex: 1, textAlign: 'center' },
  noData: {
    fontSize: 9,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: colors.textMuted,
  },
})

function formatDateId(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: idLocale })
  } catch {
    return dateStr
  }
}

export function AssessmentResultsPDF({ data }: { data: AssessmentResultsData }) {
  const accentColor = data.primaryColor || colors.accent
  const maxDistCount = Math.max(...data.scoreDistribution.map(d => d.count), 1)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: accentColor }]}>
          <Text style={[styles.orgName, { color: accentColor }]}>{data.orgName}</Text>
          <Text style={styles.reportTitle}>Laporan Hasil Assessment</Text>
          <Text style={styles.reportSubtitle}>
            {data.assessmentTitle} — {data.questionCount} soal · {data.timeLimitMinutes} menit · Passing score {data.passScore}%
          </Text>
          <Text style={styles.reportDate}>
            Tanggal laporan: {formatDateId(data.reportDate)}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.totalAttempts}</Text>
            <Text style={styles.statLabel}>Total Attempt</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.avgScore}%</Text>
            <Text style={styles.statLabel}>Rata-rata</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.medianScore}%</Text>
            <Text style={styles.statLabel}>Median</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.passRate}%</Text>
            <Text style={styles.statLabel}>Tingkat Lulus</Text>
          </View>
        </View>

        {/* Score Distribution */}
        {data.scoreDistribution.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Distribusi Skor</Text>
            {data.scoreDistribution.map((bucket, idx) => (
              <View style={styles.distRow} key={idx}>
                <Text style={styles.distLabel}>{bucket.range}</Text>
                <View style={styles.distBarBg}>
                  <View style={[styles.distBar, { width: `${(bucket.count / maxDistCount) * 100}%` }]} />
                </View>
                <Text style={styles.distCount}>{bucket.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Performers */}
        {data.topPerformers.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colRank]}>#</Text>
              <Text style={[styles.headerText, styles.colName]}>Nama</Text>
              <Text style={[styles.headerText, styles.colScore]}>Skor</Text>
              <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
            </View>
            {data.topPerformers.map((p, idx) => (
              <View style={styles.tableRow} key={idx}>
                <Text style={[styles.cellText, styles.colRank]}>{idx + 1}</Text>
                <Text style={[styles.cellText, styles.colName]}>{p.name}</Text>
                <Text style={[styles.cellText, styles.colScore]}>{p.score}%</Text>
                <Text style={[p.passed ? styles.passedText : styles.failedText, styles.colStatus]}>
                  {p.passed ? 'Lulus' : 'Gagal'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Performers */}
        {data.bottomPerformers.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Bottom Performers</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colRank]}>#</Text>
              <Text style={[styles.headerText, styles.colName]}>Nama</Text>
              <Text style={[styles.headerText, styles.colScore]}>Skor</Text>
              <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
            </View>
            {data.bottomPerformers.map((p, idx) => (
              <View style={styles.tableRow} key={idx}>
                <Text style={[styles.cellText, styles.colRank]}>{idx + 1}</Text>
                <Text style={[styles.cellText, styles.colName]}>{p.name}</Text>
                <Text style={[styles.cellText, styles.colScore]}>{p.score}%</Text>
                <Text style={[p.passed ? styles.passedText : styles.failedText, styles.colStatus]}>
                  {p.passed ? 'Lulus' : 'Gagal'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Digenerate oleh {data.orgName} via Cekatan
        </Text>
      </Page>

      {/* Page 2: Question Analysis (if data exists) */}
      {data.questionStats.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Analisis per Soal</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colRank]}>#</Text>
            <Text style={[styles.headerText, styles.colStem]}>Soal</Text>
            <Text style={[styles.headerText, styles.colAttempts]}>Attempt</Text>
            <Text style={[styles.headerText, styles.colCorrect]}>% Benar</Text>
          </View>
          {data.questionStats.map((q, idx) => (
            <View style={styles.questionRow} key={idx}>
              <Text style={[styles.cellText, styles.colRank]}>{idx + 1}</Text>
              <Text style={[styles.cellText, styles.colStem]}>
                {q.stem}
              </Text>
              <Text style={[styles.cellText, styles.colAttempts]}>{q.totalAttempts}</Text>
              <Text style={[
                q.percentCorrect < 50 ? styles.failedText : styles.cellText,
                styles.colCorrect,
              ]}>
                {q.percentCorrect}%
              </Text>
            </View>
          ))}

          <Text style={styles.footer}>
            Digenerate oleh {data.orgName} via Cekatan
          </Text>
        </Page>
      )}
    </Document>
  )
}
