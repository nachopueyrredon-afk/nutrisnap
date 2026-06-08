import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { api } from '../../src/lib/api'
import type { UserProfile } from '@nutrisnap/shared'

export default function TdeeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<UserProfile>('/users/profile')
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Calculando tu objetivo…</Text>
      </View>
    )
  }

  const goalLabels: Record<string, string> = {
    lose: 'Bajar peso',
    maintain: 'Mantener peso',
    gain: 'Subir peso',
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>Tu objetivo calórico</Text>
        <Text style={styles.subtitle}>
          {goalLabels[profile?.goal ?? 'maintain']} — calculado con la fórmula Mifflin-St Jeor
        </Text>

        <View style={styles.kcalCard}>
          <Text style={styles.kcalNumber}>{profile?.tdee_target_kcal ?? 0}</Text>
          <Text style={styles.kcalLabel}>kcal / día</Text>
        </View>

        <View style={styles.macrosRow}>
          <MacroCard label="Proteína" value={profile?.protein_target_g ?? 0} unit="g" color="#EF5350" />
          <MacroCard label="Carbos" value={profile?.carbs_target_g ?? 0} unit="g" color="#FF9800" />
          <MacroCard label="Grasas" value={profile?.fat_target_g ?? 0} unit="g" color="#66BB6A" />
        </View>

        <Text style={styles.note}>
          Podés ajustar estos valores en cualquier momento desde tu perfil.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Empezar a registrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function MacroCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={macroStyles.card}>
      <View style={[macroStyles.dot, { backgroundColor: color }]} />
      <Text style={macroStyles.value}>{value}{unit}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  )
}

const macroStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '800', color: '#212121' },
  label: { fontSize: 12, color: '#757575', marginTop: 2 },
})

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#757575', fontSize: 15 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 32, paddingTop: 64, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#212121', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  kcalCard: {
    backgroundColor: '#4CAF50', borderRadius: 24, paddingVertical: 32,
    paddingHorizontal: 48, alignItems: 'center', marginBottom: 24, width: '100%',
  },
  kcalNumber: { fontSize: 56, fontWeight: '900', color: '#fff' },
  kcalLabel: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  macrosRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 32 },
  note: { fontSize: 13, color: '#BDBDBD', textAlign: 'center', lineHeight: 20 },
  footer: { padding: 24, paddingBottom: 40 },
  btn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
