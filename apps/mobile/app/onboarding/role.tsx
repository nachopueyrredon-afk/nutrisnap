import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

type Role = 'patient' | 'professional'

export default function RoleScreen() {
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!selected) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        role: selected,
      })

      if (selected === 'patient') {
        router.push('/onboarding/profile')
      } else {
        // Professional — skip patient profile, go to tabs
        // Professional registration happens in the panel web
        router.replace('/(tabs)')
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar tu rol')
    } finally {
      setLoading(false)
    }
  }

  const options: { role: Role; label: string; desc: string; emoji: string }[] = [
    {
      role: 'patient',
      emoji: '🥗',
      label: 'Paciente',
      desc: 'Quiero registrar mis comidas y hacer seguimiento de mi progreso',
    },
    {
      role: 'professional',
      emoji: '👩‍⚕️',
      label: 'Nutricionista',
      desc: 'Quiero monitorear a mis pacientes y ajustar sus objetivos',
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¿Cómo vas a usar NutriSnap?</Text>
        <Text style={styles.subtitle}>Elegí tu perfil para personalizar la experiencia</Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.role}
            style={[styles.card, selected === opt.role && styles.cardSelected]}
            onPress={() => setSelected(opt.role)}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>{opt.emoji}</Text>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardLabel, selected === opt.role && styles.cardLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            <View style={[styles.radio, selected === opt.role && styles.radioSelected]}>
              {selected === opt.role && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continuar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 32, paddingTop: 64 },
  title: { fontSize: 26, fontWeight: '800', color: '#212121', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#757575', marginBottom: 32, lineHeight: 22 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderRadius: 16, borderWidth: 2, borderColor: '#E0E0E0',
    marginBottom: 16, backgroundColor: '#fff',
  },
  cardSelected: { borderColor: '#4CAF50', backgroundColor: '#F1F8F1' },
  cardEmoji: { fontSize: 32, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#212121', marginBottom: 4 },
  cardLabelSelected: { color: '#2E7D32' },
  cardDesc: { fontSize: 13, color: '#757575', lineHeight: 20 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#BDBDBD',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#4CAF50' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  footer: { padding: 24, paddingBottom: 40 },
  btn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#C8E6C9' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
