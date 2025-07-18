import { router } from 'expo-router';

export const navigationUtils = {
  goToModal: () => router.push('/modal'),
  goBack: () => router.back(),
  goToTab: (tab: 'index' | 'explore' | 'profile') => router.push(`/(tabs)/${tab}`),
  canGoBack: () => router.canGoBack(),
};

export type NavigationTab = 'index' | 'explore' | 'profile';