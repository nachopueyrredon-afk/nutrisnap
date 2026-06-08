import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../src/lib/api'
import type { AiScanResponse, FoodItem } from '@nutrisnap/shared'

export default function ScanPhotoScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [phase, setPhase] = useState<'camera' | 'preview' | 'results' | 'quota_exceeded'>('camera')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<AiScanResponse | null>(null)
  const [selected, setSelected] = useState<FoodItem | null>(null)

  async function takePhoto() {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
    if (photo) {
      setPhotoUri(photo.uri)
      setPhase('preview')
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
      setPhase('preview')
    }
  }

  async function analyzePhoto() {
    if (!photoUri) return
    setScanning(true)
    try {
      const form = new FormData()
      form.append('image', {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as never)

      const { data: { session } } = await (await import('../src/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const baseUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/v1'

      const response = await fetch(`${baseUrl}/ai/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (response.status === 429) {
        setPhase('quota_exceeded')
        return
      }

      if (response.status === 503) {
        Alert.alert(
          'IA no disponible',
          'El reconocimiento por foto no está disponible en este momento. Podés buscar el alimento manualmente.',
          [{ text: 'Buscar', onPress: () => router.back() }],
        )
        return
      }

      const data = await response.json() as AiScanResponse
      setResults(data)
      setPhase('results')
    } catch {
      Alert.alert('Error', 'No se pudo analizar la foto')
      setPhase('camera')
    } finally {
      setScanning(false)
    }
  }

  // No permission yet
  if (!permission) return <View style={styles.center} />

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={56} color="#BDBDBD" />
        <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Quota exceeded
  if (phase === 'quota_exceeded') {
    return (
      <View style={styles.center}>
        <Text style={styles.quotaEmoji}>📸</Text>
        <Text style={styles.quotaTitle}>Límite diario alcanzado</Text>
        <Text style={styles.quotaText}>
          En el plan gratuito podés analizar 3 fotos por día.{'\n'}
          Actualizá a Premium para uso ilimitado.
        </Text>
        <TouchableOpacity style={styles.premiumBtn}>
          <Text style={styles.premiumBtnText}>Ver Premium</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={() => router.back()}>
          <Text style={styles.searchBtnText}>Buscar manualmente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Results
  if (phase === 'results' && results) {
    if (results.matches.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.quotaEmoji}>🤔</Text>
          <Text style={styles.quotaTitle}>No pude identificar el alimento</Text>
          <Text style={styles.quotaText}>Intentá con otra foto o buscá manualmente</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={() => router.back()}>
            <Text style={styles.searchBtnText}>Buscar manualmente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.searchBtn, { marginTop: 8 }]} onPress={() => setPhase('camera')}>
            <Text style={styles.searchBtnText}>Tomar otra foto</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (selected) {
      router.push({
        pathname: '/add-food',
        params: { food_id: selected.id, meal: meal ?? '', from_scan: '1' },
      })
      return null
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPhase('camera')}>
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resultados</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* OBLIGATORIO: mostrar que es una estimación */}
        <View style={styles.estimationBanner}>
          <Ionicons name="information-circle" size={16} color="#FF9800" />
          <Text style={styles.estimationText}>Estimación inteligente — verificá antes de confirmar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultsList}>
          {results.matches.map((match, i) => (
            <TouchableOpacity
              key={i}
              style={styles.matchCard}
              onPress={() => setSelected(match.food_item)}
            >
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>{match.food_item.name}</Text>
                <Text style={styles.matchKcal}>
                  {Math.round(match.food_item.kcal_per_100g)} kcal/100g
                </Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(match.confidence * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.notHereBtn} onPress={() => router.back()}>
            <Text style={styles.notHereText}>No es ninguno de estos → buscar manualmente</Text>
          </TouchableOpacity>
        </ScrollView>

        {results.quota_remaining !== null && results.quota_remaining !== undefined && (
          <Text style={styles.quotaHint}>
            Te quedan {results.quota_remaining} foto{results.quota_remaining !== 1 ? 's' : ''} gratis hoy
          </Text>
        )}
      </View>
    )
  }

  // Preview before sending
  if (phase === 'preview' && photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhase('camera')}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retakeBtnText}>Otra foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.analyzeBtn} onPress={analyzePhoto} disabled={scanning}>
            {scanning
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="sparkles" size={20} color="#fff" /><Text style={styles.analyzeBtnText}>Analizar</Text></>
            }
          </TouchableOpacity>
        </View>
        <View style={styles.estimationBannerPreview}>
          <Text style={styles.estimationText}>Estimación inteligente — los resultados son aproximados</Text>
        </View>
      </View>
    )
  }

  // Camera
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.frameGuide}>
            <Text style={styles.frameText}>Encuadrá el alimento</Text>
          </View>

          <View style={styles.cameraActions}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 56 },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  frameGuide: { alignItems: 'center' },
  frameText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  cameraActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 32,
  },
  galleryBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  preview: { flex: 1 },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 24, paddingBottom: 48, gap: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  retakeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  analyzeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, backgroundColor: '#4CAF50',
  },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  estimationBannerPreview: {
    position: 'absolute', top: 56, left: 16, right: 16,
    backgroundColor: 'rgba(255,152,0,0.9)', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#212121' },
  estimationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  estimationText: { fontSize: 13, color: '#E65100', flex: 1 },
  resultsList: { padding: 16, gap: 12 },
  matchCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 4 },
  matchKcal: { fontSize: 13, color: '#757575' },
  confidenceBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  confidenceText: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  notHereBtn: { paddingVertical: 16, alignItems: 'center' },
  notHereText: { color: '#4CAF50', fontSize: 14 },
  quotaHint: { textAlign: 'center', color: '#9E9E9E', fontSize: 12, paddingBottom: 20 },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginTop: 16, marginBottom: 24, textAlign: 'center' },
  permBtn: { backgroundColor: '#4CAF50', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  quotaEmoji: { fontSize: 56, marginBottom: 16 },
  quotaTitle: { fontSize: 20, fontWeight: '800', color: '#212121', textAlign: 'center', marginBottom: 12 },
  quotaText: { fontSize: 14, color: '#757575', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  premiumBtn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40, marginBottom: 12,
  },
  premiumBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  searchBtn: { paddingVertical: 12 },
  searchBtnText: { color: '#4CAF50', fontSize: 14 },
})
