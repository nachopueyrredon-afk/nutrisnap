import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { api } from '../../src/lib/api'
import type { UserProfile } from '@nutrisnap/shared'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<UserProfile>('/users/profile')
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [])

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ])
  }

  const goalLabel: Record<string, string> = {
    lose: 'Bajar peso', maintain: 'Mantener', gain: 'Subir peso',
  }
  const activityLabel: Record<string, string> = {
    sedentary: 'Sedentario', light: 'Liviano', moderate: 'Moderado', very_active: 'Muy activo',
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi perfil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUENTA</Text>
          <View style={styles.card}>
            <Row label="Email" value={user?.email ?? '-'} />
          </View>
        </View>

        {/* Physical data */}
        {loading
          ? <ActivityIndicator color="#4CAF50" style={{ marginTop: 24 }} />
          : profile && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DATOS FÍSICOS</Text>
              <View style={styles.card}>
                <Row label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : '-'} />
                <Row label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : '-'} />
                <Row label="Edad" value={profile.age ? `${profile.age} años` : '-'} />
                <Row label="Objetivo" value={goalLabel[profile.goal ?? ''] ?? '-'} />
                <Row label="Actividad" value={activityLabel[profile.activity_level ?? ''] ?? '-'} last />
              </View>
            </View>
          )
        }

        {/* Targets */}
        {profile?.tdee_target_kcal && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OBJETIVOS DIARIOS</Text>
            <View style={styles.targetsGrid}>
              <TargetCard label="Calorías" value={`${profile.tdee_target_kcal}`} unit="kcal" color="#4CAF50" />
              <TargetCard label="Proteína" value={`${profile.protein_target_g}`} unit="g" color="#EF5350" />
              <TargetCard label="Carbos" value={`${profile.carbs_target_g}`} unit="g" color="#FF9800" />
              <TargetCard label="Grasas" value={`${profile.fat_target_g}`} unit="g" color="#66BB6A" />
            </View>
          </View>
        )}

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  label: { fontSize: 15, color: '#616161' },
  value: { fontSize: 15, fontWeight: '600', color: '#212121' },
})

function TargetCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[targetStyles.card, { borderTopColor: color }]}>
      <Text style={targetStyles.value}>{value}</Text>
      <Text style={targetStyles.unit}>{unit}</Text>
      <Text style={targetStyles.label}>{label}</Text>
    </View>
  )
}

const targetStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, borderTopWidth: 3,
  },
  value: { fontSize: 22, fontWeight: '800', color: '#212121' },
  unit: { fontSize: 12, color: '#9E9E9E' },
  label: { fontSize: 12, color: '#757575', marginTop: 4 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#212121' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#9E9E9E',
    letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase',
  },
  card: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
  targetsGrid: { flexDirection: 'row', gap: 10 },
  signOutBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EF5350',
  },
  signOutText: { color: '#EF5350', fontSize: 15, fontWeight: '700' },
})
