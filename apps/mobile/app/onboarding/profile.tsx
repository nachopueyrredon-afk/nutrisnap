import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { api } from '../../src/lib/api'
import type { ActivityLevel, BiologicalSex, Goal } from '@nutrisnap/shared'

type Chip<T> = { value: T; label: string }

const SEX_OPTIONS: Chip<BiologicalSex>[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
]

const GOAL_OPTIONS: Chip<Goal>[] = [
  { value: 'lose', label: 'Bajar peso' },
  { value: 'maintain', label: 'Mantener' },
  { value: 'gain', label: 'Subir peso' },
]

const ACTIVITY_OPTIONS: Chip<ActivityLevel>[] = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Liviano' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'very_active', label: 'Muy activo' },
]

function ChipGroup<T extends string>({
  options, selected, onSelect,
}: { options: Chip<T>[]; selected: T | null; onSelect: (v: T) => void }) {
  return (
    <View style={chipStyles.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[chipStyles.chip, selected === opt.value && chipStyles.chipSelected]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[chipStyles.label, selected === opt.value && chipStyles.labelSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#4CAF50', backgroundColor: '#F1F8F1' },
  label: { fontSize: 14, color: '#616161', fontWeight: '500' },
  labelSelected: { color: '#2E7D32', fontWeight: '700' },
})

export default function ProfileScreen() {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<BiologicalSex | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [activity, setActivity] = useState<ActivityLevel | null>(null)
  const [loading, setLoading] = useState(false)

  const isValid = weight && height && age && sex && goal && activity

  async function handleSave() {
    if (!isValid) return
    setLoading(true)
    try {
      await api.post('/users/profile', {
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        age: parseInt(age, 10),
        biological_sex: sex,
        goal,
        activity_level: activity,
      })
      router.push('/onboarding/tdee')
    } catch {
      Alert.alert('Error', 'No se pudo guardar tu perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tu perfil físico</Text>
        <Text style={styles.subtitle}>Usamos estos datos para calcular tus calorías objetivo</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor="#BDBDBD"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="170"
              placeholderTextColor="#BDBDBD"
            />
          </View>
        </View>

        <Text style={styles.label}>Edad</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor="#BDBDBD"
        />

        <Text style={styles.label}>Sexo biológico</Text>
        <ChipGroup options={SEX_OPTIONS} selected={sex} onSelect={setSex} />

        <Text style={[styles.label, { marginTop: 16 }]}>Objetivo</Text>
        <ChipGroup options={GOAL_OPTIONS} selected={goal} onSelect={setGoal} />

        <Text style={[styles.label, { marginTop: 16 }]}>Nivel de actividad</Text>
        <ChipGroup options={ACTIVITY_OPTIONS} selected={activity} onSelect={setActivity} />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !isValid && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Calcular mi objetivo</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 32, paddingTop: 64 },
  title: { fontSize: 26, fontWeight: '800', color: '#212121', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#757575', marginBottom: 32, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  halfField: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#616161', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: '#212121', marginBottom: 20,
  },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  btn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#C8E6C9' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
