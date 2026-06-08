import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDiaryDay } from '../../src/hooks/useDiaryDay'
import { DiaryEntryItem } from '../../src/components/ui/DiaryEntryItem'
import type { DiaryEntry, MealType } from '@nutrisnap/shared'

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - i)
  return d.toISOString().slice(0, 10)
})

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack',
}

function formatDay(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const today = new Date().toISOString().slice(0, 10)
  if (iso === today) return 'Hoy'
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(DAYS[0]!)
  const { data, loading, refresh } = useDiaryDay(selectedDate)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diario</Text>
        <TouchableOpacity onPress={() => router.push('/add-food')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <FlatList
        horizontal
        data={DAYS}
        keyExtractor={(d) => d}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.dayChip, selectedDate === item && styles.dayChipSelected]}
            onPress={() => setSelectedDate(item)}
          >
            <Text style={[styles.dayText, selectedDate === item && styles.dayTextSelected]}>
              {formatDay(item)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading
        ? <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={data?.entries ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DiaryEntryItem entry={item as never} onDelete={refresh} />
            )}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              data && (
                <View style={styles.totalsBar}>
                  <TotalChip label="kcal" value={Math.round(data.totals.kcal)} />
                  <TotalChip label="Prot" value={`${Math.round(data.totals.protein_g)}g`} />
                  <TotalChip label="Carbs" value={`${Math.round(data.totals.carbs_g)}g`} />
                  <TotalChip label="Grasas" value={`${Math.round(data.totals.fat_g)}g`} />
                </View>
              )
            }
            ListEmptyComponent={
              <Text style={styles.empty}>Sin registros para este día</Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )
      }
    </View>
  )
}

function TotalChip({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.value}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  )
}

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1 },
  value: { fontSize: 17, fontWeight: '800', color: '#212121' },
  label: { fontSize: 11, color: '#9E9E9E' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#212121' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  dayList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff' },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F5F5F5',
  },
  dayChipSelected: { backgroundColor: '#4CAF50' },
  dayText: { fontSize: 13, fontWeight: '600', color: '#616161' },
  dayTextSelected: { color: '#fff' },
  totalsBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 16,
  },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  empty: { textAlign: 'center', color: '#BDBDBD', marginTop: 48, fontSize: 14 },
})
