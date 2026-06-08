import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Vibration,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../src/lib/api'
import type { FoodItem } from '@nutrisnap/shared'

export default function ScanBarcodeScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBarcode({ data }: BarcodeScanningResult) {
    if (scanned || loading) return
    setScanned(true)
    setLoading(true)
    setError(null)
    Vibration.vibrate(100)

    try {
      const food = await api.post<FoodItem>('/foods/barcode', { barcode: data })
      // Navigate to add-food with the found food pre-selected
      router.replace({
        pathname: '/add-food',
        params: { food_id: food.id, meal: meal ?? '', from_scan: 'barcode' },
      })
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 404) {
        setError(`Código ${data} no encontrado en nuestra base de datos`)
      } else {
        setError('No se pudo conectar con el servidor')
      }
      // Allow re-scan after error
      setTimeout(() => {
        setScanned(false)
        setError(null)
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="barcode-outline" size={56} color="#BDBDBD" />
        <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
        <Text style={styles.permText}>Necesitamos acceso a la cámara para escanear códigos de barras</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Escanear código de barras</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Scan frame */}
          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hint}>Alineá el código de barras dentro del recuadro</Text>
          </View>

          {/* Status */}
          <View style={styles.statusArea}>
            {loading && (
              <View style={styles.statusCard}>
                <ActivityIndicator color="#4CAF50" />
                <Text style={styles.statusText}>Buscando alimento…</Text>
              </View>
            )}
            {error && (
              <View style={[styles.statusCard, styles.errorCard]}>
                <Ionicons name="alert-circle" size={20} color="#EF5350" />
                <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
              </View>
            )}
            {!loading && !error && (
              <Text style={styles.freeText}>🎉 El escáner de barras siempre es gratis</Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const CORNER_SIZE = 24
const CORNER_WIDTH = 3

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  overlay: { flex: 1, justifyContent: 'space-between', paddingBottom: 48 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  frameContainer: { alignItems: 'center', gap: 20 },
  frame: {
    width: 260, height: 160,
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: '#4CAF50',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 6 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },
  statusArea: { paddingHorizontal: 24, alignItems: 'center' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  errorCard: { backgroundColor: 'rgba(239,83,80,0.15)', borderWidth: 1, borderColor: '#EF5350' },
  statusText: { color: '#fff', fontSize: 14 },
  errorText: { color: '#EF5350' },
  freeText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  permText: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  permBtn: { backgroundColor: '#4CAF50', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
