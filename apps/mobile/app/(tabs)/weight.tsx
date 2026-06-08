import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { api } from '../../src/lib/api'
import type { WeightLog } from '@nutrisnap/shared'

export default function WeightScreen() {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadLogs() {
    try {
      const data = await api.get<WeightLog[]>('/weight?limit=30')
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [])

  async function handleSave() {
    const w = parseFloat(weight)
    if (!w || w < 20 || w > 500) {
      Alert.alert('Ingresá un peso válido (entre 20 y 500 kg)')
      return
    }
    setSaving(true)
    try {
      await api.post('/weight', { weight_kg: w })
      setWeight('')
      loadLogs()
    } finally {
      setSaving(false)
    }
  }

  const latest = logs[0]
  const previous = logs[1]
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Peso</Text>
      </View>

      {/* Current weight card */}
      <View style={styles.card}>
        {latest ? (
          <>
            <Text style={styles.currentWeight}>{latest.weight_kg} kg</Text>
            {delta !== null && (
              <Text style={[styles.delta, delta <= 0 ? styles.deltaGood : styles.deltaBad]}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg desde el registro anterior
              </Text>
            )}
            <Text style={styles.lastDate}>
              Último registro: {new Date(latest.logged_at).toLocaleDateString('es-AR')}
            </Text>
          </>
        ) : (
          <Text style={styles.noData}>Todavía no registraste tu peso</Text>
        )}
      </View>

      {/* Log new weight */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="70.5"
          keyboardType="decimal-pad"
          placeholderTextColor="#BDBDBD"
        />
        <Text style={styles.kgLabel}>kg</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={styles.historyTitle}>Historial</Text>
      {loading
        ? <ActivityIndicator color="#4CAF50" style={{ marginTop: 32 }} />
        : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const prev = logs[index + 1]
              const d = prev ? item.weight_kg - prev.weight_kg : null
              return (
                <View style={styles.logItem}>
                  <View>
                    <Text style={styles.logWeight}>{item.weight_kg} kg</Text>
                    <Text style={styles.logDate}>
                      {new Date(item.logged_at).toLocaleDateString('es-AR', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </Text>
                  </View>
                  {d !== null && (
                    <Text style={[styles.logDelta, d <= 0 ? styles.deltaGood : styles.deltaBad]}>
                      {d > 0 ? '+' : ''}{d.toFixed(1)} kg
                    </Text>
                  )}
                </View>
              )
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )
      }
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#212121' },
  card: {
    backgroundColor: '#4CAF50', margin: 16, borderRadius: 20,
    padding: 28, alignItems: 'center',
  },
  currentWeight: { fontSize: 56, fontWeight: '900', color: '#fff' },
  delta: { fontSize: 14, marginTop: 4 },
  deltaGood: { color: 'rgba(255,255,255,0.9)' },
  deltaBad: { color: '#FFCDD2' },
  lastDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  noData: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 24,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 20,
    fontWeight: '700', color: '#212121', backgroundColor: '#fff',
  },
  kgLabel: { fontSize: 16, color: '#757575', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  historyTitle: {
    fontSize: 13, fontWeight: '700', color: '#9E9E9E',
    letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8,
    textTransform: 'uppercase',
  },
  logItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
  },
  logWeight: { fontSize: 17, fontWeight: '700', color: '#212121' },
  logDate: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  logDelta: { fontSize: 14, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F5F5F5' },
})
