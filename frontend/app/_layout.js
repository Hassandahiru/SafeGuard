import { Stack } from "expo-router";
import { AppProvider } from '../context/AppContext';
import { AuthWrapper } from '../components/auth/AuthWrapper';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthWrapper>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthWrapper>
      </AppProvider>
    </ErrorBoundary>
  );
}
