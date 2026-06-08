import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../src/lib/api'
import type { FoodItem, MealType, FoodSearchResult } from '@nutrisnap/shared'

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Desayuno', emoji: '🌅' },
  { value: 'lunch', label: 'Almuerzo', emoji: '☀️' },
  { value: 'dinner', label: 'Cena', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
]

function getMealForHour(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

export default function AddFoodScreen() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState('g')
  const [meal, setMeal] = useState<MealType>(getMealForHour())
  const [saving, setSaving] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const data = await api.get<FoodSearchResult>(`/foods/search?q=${encodeURIComponent(q)}&limit=20`)
      setResults(data.items)
    } finally {
      setSearching(false)
    }
  }, [])

  function handleQueryChange(text: string) {
    setQuery(text)
    search(text)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      await api.post('/diary/entries', {
        food_item_id: selected.id,
        meal_type: meal,
        quantity: parseFloat(quantity) || 100,
        unit,
        entry_method: 'manual_search',
      })
      router.back()
    } finally {
      setSaving(false)
    }
  }

  if (selected) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selected.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Meal selector */}
          <Text style={styles.sectionLabel}>MOMENTO</Text>
          <View style={styles.mealRow}>
            {MEAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.mealChip, meal === opt.value && styles.mealChipSelected]}
                onPress={() => setMeal(opt.value)}
              >
                <Text>{opt.emoji}</Text>
                <Text style={[styles.mealChipText, meal === opt.value && styles.mealChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>CANTIDAD</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <View style={styles.unitRow}>
              {['g', 'unit', 'cup', 'tbsp'].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipSelected]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextSelected]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Macro preview */}
          {(() => {
            const g = unit === 'g' ? parseFloat(quantity) || 0
              : unit === 'unit' ? (parseFloat(quantity) || 0) * selected.serving_size_g
              : parseFloat(quantity) || 0
            const factor = g / 100
            return (
              <View style={styles.preview}>
                <MacroPreview label="kcal" value={Math.round(selected.kcal_per_100g * factor)} />
                <MacroPreview label="Prot" value={Math.round(selected.protein_per_100g * factor * 10) / 10} unit="g" />
                <MacroPreview label="Carbs" value={Math.round(selected.carbs_per_100g * factor * 10) / 10} unit="g" />
                <MacroPreview label="Grasas" value={Math.round(selected.fat_per_100g * factor * 10) / 10} unit="g" />
              </View>
            )
          })()}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Agregar al diario</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar alimento</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alimento..."
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          placeholderTextColor="#BDBDBD"
        />
        {searching && <ActivityIndicator size="small" color="#4CAF50" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => setSelected(item)}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.resultMeta}>
                por {item.serving_label ?? `${item.serving_size_g}g`}
              </Text>
            </View>
            <Text style={styles.resultKcal}>
              {Math.round(item.kcal_per_100g)} kcal/100g
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          query.length >= 2 && !searching
            ? <Text style={styles.empty}>Sin resultados para "{query}"</Text>
            : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

function MacroPreview({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <View style={macroStyles.item}>
      <Text style={macroStyles.value}>{value}{unit ?? ''}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  )
}

const macroStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  value: { fontSize: 18, fontWeight: '800', color: '#212121' },
  label: { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#212121', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F5F5F5', borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#212121' },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  resultMeta: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  resultKcal: { fontSize: 13, color: '#757575' },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 20 },
  empty: { textAlign: 'center', color: '#BDBDBD', marginTop: 40, fontSize: 14 },
  content: { flex: 1, padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9E9E9E', letterSpacing: 0.5, marginBottom: 12 },
  mealRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  mealChipSelected: { borderColor: '#4CAF50', backgroundColor: '#F1F8F1' },
  mealChipText: { fontSize: 13, color: '#616161', fontWeight: '500' },
  mealChipTextSelected: { color: '#2E7D32', fontWeight: '700' },
  quantityRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  quantityInput: {
    borderWidth: 1.5, borderColor: '#4CAF50', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    fontSize: 28, fontWeight: '800', color: '#212121',
    width: 120, textAlign: 'center',
  },
  unitRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
  },
  unitChipSelected: { borderColor: '#4CAF50', backgroundColor: '#F1F8F1' },
  unitText: { fontSize: 13, color: '#616161' },
  unitTextSelected: { color: '#2E7D32', fontWeight: '700' },
  preview: {
    flexDirection: 'row', backgroundColor: '#F5F5F5',
    borderRadius: 14, padding: 16, marginTop: 24,
  },
  footer: { padding: 24, paddingBottom: 40 },
  saveBtn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
