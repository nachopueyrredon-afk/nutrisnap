import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import type { DiaryEntry } from '@nutrisnap/shared'
import { api } from '../../lib/api'

interface Props {
  entry: DiaryEntry & { food_items?: { name: string } }
  onDelete: () => void
}

export function DiaryEntryItem({ entry, onDelete }: Props) {
  function confirmDelete() {
    Alert.alert('Eliminar entrada', '¿Querés eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await api.delete(`/diary/entries/${entry.id}`)
          onDelete()
        },
      },
    ])
  }

  return (
    <TouchableOpacity style={styles.container} onLongPress={confirmDelete} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.food_items?.name ?? 'Alimento'}
        </Text>
        <Text style={styles.quantity}>
          {entry.quantity}{entry.unit}
        </Text>
      </View>
      <View style={styles.macros}>
        <Text style={styles.kcal}>{Math.round(entry.kcal_computed)} kcal</Text>
        <View style={styles.dots}>
          <Text style={styles.dot}>P {Math.round(entry.protein_computed)}g</Text>
          <Text style={styles.dot}>C {Math.round(entry.carbs_computed)}g</Text>
          <Text style={styles.dot}>G {Math.round(entry.fat_computed)}g</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#212121', marginBottom: 2 },
  quantity: { fontSize: 12, color: '#9E9E9E' },
  macros: { alignItems: 'flex-end' },
  kcal: { fontSize: 15, fontWeight: '700', color: '#212121' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dot: { fontSize: 11, color: '#9E9E9E' },
})
