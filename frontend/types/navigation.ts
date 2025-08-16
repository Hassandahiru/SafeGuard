export type RootStackParamList = {
  '(tabs)': undefined;
  'auth': undefined;
  'modal': { title: string };
  '+not-found': undefined;
};

export type TabsParamList = {
  'index': undefined;
  'explore': undefined;
  'profile': undefined;
  'settings': undefined;
};

export type AuthStackParamList = {
  'login': undefined;
  'register': undefined;
  'forgot-password': undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}