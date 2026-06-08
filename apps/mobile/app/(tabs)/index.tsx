import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CalorieBar } from '../../src/components/ui/CalorieBar'
import { MacroBar } from '../../src/components/ui/MacroBar'
import { DiaryEntryItem } from '../../src/components/ui/DiaryEntryItem'
import { useDiaryDay } from '../../src/hooks/useDiaryDay'
import type { DiaryEntry, MealType } from '@nutrisnap/shared'

const today = new Date().toISOString().slice(0, 10)

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function TodayScreen() {
  const { data, loading, refresh } = useDiaryDay(today)

  const entriesByMeal = MEAL_ORDER.reduce<Record<MealType, DiaryEntry[]>>(
    (acc, meal) => {
      acc[meal] = (data?.entries ?? []).filter((e) => e.meal_type === meal) as DiaryEntry[]
      return acc
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] },
  )

  const totals = data?.totals ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  const targets = data?.targets ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDate(today)}</Text>
        <TouchableOpacity onPress={() => router.push('/add-food')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#4CAF50" />}
      >
        {/* Calorie bar */}
        <View style={styles.card}>
          <CalorieBar consumed={totals.kcal} target={targets.kcal} />
          <View style={styles.macroSection}>
            <MacroBar label="Proteína" consumed={totals.protein_g} target={targets.protein_g} color="#EF5350" />
            <MacroBar label="Carbohidratos" consumed={totals.carbs_g} target={targets.carbs_g} color="#FF9800" />
            <MacroBar label="Grasas" consumed={totals.fat_g} target={targets.fat_g} color="#66BB6A" />
          </View>
        </View>

        {/* Meal groups */}
        {MEAL_ORDER.map((meal) => {
          const entries = entriesByMeal[meal]
          if (entries.length === 0) return null
          return (
            <View key={meal} style={styles.mealGroup}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealLabel}>{MEAL_LABELS[meal]}</Text>
                <Text style={styles.mealKcal}>
                  {Math.round(entries.reduce((s, e) => s + e.kcal_computed, 0))} kcal
                </Text>
              </View>
              {entries.map((entry) => (
                <DiaryEntryItem key={entry.id} entry={entry as never} onDelete={refresh} />
              ))}
            </View>
          )
        })}

        {/* Empty state */}
        {(data?.entries ?? []).length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥗</Text>
            <Text style={styles.emptyTitle}>Todavía no registraste nada hoy</Text>
            <Text style={styles.emptyText}>Tocá el botón + para agregar tu primera comida</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-food')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff',
  },
  dateText: { fontSize: 17, fontWeight: '700', color: '#212121', textTransform: 'capitalize' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, overflow: 'hidden' },
  macroSection: { paddingHorizontal: 20, paddingBottom: 16 },
  mealGroup: { marginHorizontal: 16, marginBottom: 8 },
  mealHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
  },
  mealLabel: { fontSize: 13, fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealKcal: { fontSize: 13, color: '#BDBDBD' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#212121', textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 8,
  },
})
