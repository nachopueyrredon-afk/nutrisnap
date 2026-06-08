import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
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
  // food_id + from_scan: support pre-selection from photo/barcode scan
  const { food_id, meal: mealParam, from_scan } = useLocalSearchParams<{
    food_id?: string
    meal?: string
    from_scan?: string
  }>()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [loadingPreselect, setLoadingPreselect] = useState(false)
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState('g')
  const [meal, setMeal] = useState<MealType>(
    (mealParam as MealType | undefined) ?? getMealForHour(),
  )
  const [saving, setSaving] = useState(false)

  // If we arrived from a scan screen with a food_id, fetch that food and pre-select it
  useEffect(() => {
    if (!food_id) return
    setLoadingPreselect(true)
    api.get<FoodItem>(`/foods/${food_id}`)
      .then((food) => setSelected(food))
      .finally(() => setLoadingPreselect(false))
  }, [food_id])

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
      const entryMethod = from_scan === 'barcode' ? 'barcode_scan'
        : from_scan ? 'ai_photo'
        : 'manual_search'
      await api.post('/diary/entries', {
        food_item_id: selected.id,
        meal_type: meal,
        quantity: parseFloat(quantity) || 100,
        unit,
        entry_method: entryMethod,
      })
      router.back()
    } finally {
      setSaving(false)
    }
  }

  if (loadingPreselect) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    )
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

        {/* Estimation banner when coming from AI photo */}
        {from_scan === '1' && (
          <View style={styles.estimationBanner}>
            <Ionicons name="information-circle" size={16} color="#FF9800" />
            <Text style={styles.estimationText}>Estimación inteligente — verificá los macros antes de confirmar</Text>
          </View>
        )}

        <View style={styles.content}>
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

      {/* Scan shortcuts */}
      <View style={styles.scanRow}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push({ pathname: '/scan-photo', params: { meal } })}
        >
          <Ionicons name="camera" size={20} color="#4CAF50" />
          <Text style={styles.scanBtnText}>Foto IA</Text>
        </TouchableOpacity>
        <View style={styles.scanDivider} />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push({ pathname: '/scan-barcode', params: { meal } })}
        >
          <Ionicons name="barcode-outline" size={20} color="#4CAF50" />
          <Text style={styles.scanBtnText}>Código de barras</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>o buscá por nombre</Text>
        <View style={styles.orLine} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alimento..."
          value={query}
          onChangeText={handleQueryChange}
          autoFocus={!food_id}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#212121', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  scanRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#F5FFF5', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#C8E6C9', overflow: 'hidden',
  },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  scanBtnText: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  scanDivider: { width: 1, backgroundColor: '#C8E6C9', marginVertical: 10 },
  orRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 14, marginBottom: 4, gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#EEEEEE' },
  orText: { fontSize: 12, color: '#BDBDBD' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12,
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
  estimationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  estimationText: { fontSize: 13, color: '#E65100', flex: 1 },
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
