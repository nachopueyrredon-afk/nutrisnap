import { useEffect } from 'react'
import { router, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { api } from '../src/lib/api'

SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const { session, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()

    if (!session) {
      router.replace('/auth')
      return
    }

    // Check if onboarding is complete
    api.get('/users/profile')
      .then(() => router.replace('/(tabs)'))
      .catch(() => router.replace('/onboarding/disclaimer'))
  }, [session, loading])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
