import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Vibration, Dimensions,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../src/lib/api'
import type { FoodItem } from '@nutrisnap/shared'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height
const FRAME_W = 280
const FRAME_H = 200  // rectangular for barcodes; QR also scans fine
const FRAME_TOP = (SCREEN_H - FRAME_H) / 2 - 40  // slightly above center

const DIM = 'rgba(0,0,0,0.62)'
const CORNER = 3
const CORNER_SIZE = 28

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
    Vibration.vibrate(120)

    try {
      const food = await api.post<FoodItem>('/foods/barcode', { barcode: data })
      router.replace({
        pathname: '/add-food',
        params: { food_id: food.id, meal: meal ?? '', from_scan: 'barcode' },
      })
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      setError(
        status === 404
          ? 'Código no encontrado — intentá buscar por nombre'
          : 'No se pudo conectar. Verificá tu conexión.',
      )
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
        <Text style={styles.permText}>
          Necesitamos acceso a la cámara para escanear códigos de barras y QR
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir acceso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const frameLeft = (SCREEN_W - FRAME_W) / 2

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Dark overlay: 4 panels around the transparent frame */}
      {/* Top */}
      <View style={[styles.dimPanel, { top: 0, left: 0, right: 0, height: FRAME_TOP }]} />
      {/* Bottom */}
      <View style={[styles.dimPanel, { top: FRAME_TOP + FRAME_H, left: 0, right: 0, bottom: 0 }]} />
      {/* Left */}
      <View style={[styles.dimPanel, {
        top: FRAME_TOP, left: 0, width: frameLeft, height: FRAME_H,
      }]} />
      {/* Right */}
      <View style={[styles.dimPanel, {
        top: FRAME_TOP, left: frameLeft + FRAME_W, right: 0, height: FRAME_H,
      }]} />

      {/* Corner brackets */}
      {/* TL */}
      <View style={[styles.corner, {
        top: FRAME_TOP, left: frameLeft,
        borderTopWidth: CORNER, borderLeftWidth: CORNER, borderTopLeftRadius: 8,
      }]} />
      {/* TR */}
      <View style={[styles.corner, {
        top: FRAME_TOP, left: frameLeft + FRAME_W - CORNER_SIZE,
        borderTopWidth: CORNER, borderRightWidth: CORNER, borderTopRightRadius: 8,
      }]} />
      {/* BL */}
      <View style={[styles.corner, {
        top: FRAME_TOP + FRAME_H - CORNER_SIZE, left: frameLeft,
        borderBottomWidth: CORNER, borderLeftWidth: CORNER, borderBottomLeftRadius: 8,
      }]} />
      {/* BR */}
      <View style={[styles.corner, {
        top: FRAME_TOP + FRAME_H - CORNER_SIZE, left: frameLeft + FRAME_W - CORNER_SIZE,
        borderBottomWidth: CORNER, borderRightWidth: CORNER, borderBottomRightRadius: 8,
      }]} />

      {/* Scan line animation hint */}
      <View style={[styles.scanLine, { top: FRAME_TOP + FRAME_H / 2, left: frameLeft + 12, width: FRAME_W - 24 }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Hint below frame */}
      <View style={[styles.hintArea, { top: FRAME_TOP + FRAME_H + 20 }]}>
        <Text style={styles.hintText}>
          Alineá el código de barras o QR dentro del recuadro
        </Text>
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
            <Ionicons name="alert-circle" size={18} color="#EF5350" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.errorAction}>Buscar manualmente →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!loading && !error && (
          <View style={styles.freeTag}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.freeText}>El escáner siempre es gratis</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  dimPanel: { position: 'absolute', backgroundColor: DIM },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: '#4CAF50',
  },
  scanLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(76,175,80,0.6)',
    borderRadius: 1,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hintArea: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center',
    paddingHorizontal: 32,
  },
  hintText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },
  statusArea: {
    position: 'absolute', bottom: 64, left: 24, right: 24, alignItems: 'center',
  },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14, width: '100%',
  },
  errorCard: { backgroundColor: 'rgba(239,83,80,0.15)', borderWidth: 1, borderColor: '#EF5350' },
  statusText: { color: '#fff', fontSize: 14 },
  errorText: { color: '#EF5350', fontSize: 14, fontWeight: '600' },
  errorAction: { color: '#fff', fontSize: 13, marginTop: 4 },
  freeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  freeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  permText: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  permBtn: { backgroundColor: '#4CAF50', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 12 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backBtn: { paddingVertical: 12 },
  backBtnText: { color: '#757575', fontSize: 14 },
})
