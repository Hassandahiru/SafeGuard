import { Tabs } from 'expo-router';
import { Platform, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVisitor } from '../../context/VisitorContext';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { openNewVisitModal } = useVisitor();
  
  const handleNewVisit = () => {
    openNewVisitModal();
  };

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'white',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      paddingBottom: Platform.OS === 'ios' ? 20 : 10,
      height: Platform.OS === 'ios' ? 90 : 70,
      justifyContent: 'space-around',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Home Tab */}
      <TouchableOpacity
        onPress={() => navigation.navigate('index')}
        style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}
      >
        <Ionicons 
          name={state.index === 0 ? 'home' : 'home-outline'} 
          size={24} 
          color={state.index === 0 ? '#007AFF' : '#666'} 
        />
      </TouchableOpacity>
      
      {/* New Visit FAB */}
      <TouchableOpacity
        onPress={handleNewVisit}
        style={{
          position: 'absolute',
          top: -20,
          backgroundColor: '#007AFF',
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#007AFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      
      {/* History Tab */}
      <TouchableOpacity
        onPress={() => navigation.navigate('history')}
        style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}
      >
        <Ionicons 
          name={state.index === 1 ? 'time' : 'time-outline'} 
          size={24} 
          color={state.index === 1 ? '#007AFF' : '#666'} 
        />
      </TouchableOpacity>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

