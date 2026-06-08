import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="disclaimer" />
      <Stack.Screen name="role" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="tdee" />
    </Stack>
  )
}
