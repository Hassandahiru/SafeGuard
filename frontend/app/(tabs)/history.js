import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from "react-native";

export default function HistoryScreen() {
  const [filter, setFilter] = useState('all');

  const visitors = [
    {
      id: '1',
      name: 'John Smith',
      phone: '+234 703 310 86608',
      status: 'approved',
      visitDate: '2024-01-15',
      visitTime: '2:30 PM',
      code: 'VS001',
      purpose: 'Business Meeting'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      phone: '+234 703 310 86609',
      status: 'used',
      visitDate: '2024-01-14',
      visitTime: '10:00 AM',
      code: 'VS002',
      purpose: 'Personal Visit'
    },
    {
      id: '3',
      name: 'Mike Davis',
      phone: '+234 703 310 86610',
      status: 'expired',
      visitDate: '2024-01-10',
      visitTime: '4:00 PM',
      code: 'VS003',
      purpose: 'Delivery'
    },
    {
      id: '4',
      name: 'Emily Wilson',
      phone: '+234 703 310 86611',
      status: 'approved',
      visitDate: '2024-01-12',
      visitTime: '1:15 PM',
      code: 'VS004',
      purpose: 'Maintenance'
    }
  ];

  const filteredVisitors = filter === 'all' 
    ? visitors 
    : visitors.filter(visitor => visitor.status === filter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'used': return '#6B7280';
      case 'expired': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'used': return '✔️';
      case 'expired': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{ 
          backgroundColor: 'white', 
          paddingTop: 50, 
          paddingBottom: 20, 
          paddingHorizontal: 20,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 }}>
            Visitor History
          </Text>
          <Text style={{ fontSize: 16, color: '#666' }}>
            {filteredVisitors.length} visitors found
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={{ 
          flexDirection: 'row', 
          paddingHorizontal: 20, 
          paddingVertical: 16,
          backgroundColor: '#f5f5f5'
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'approved', 'used', 'expired', 'pending'].map((filterType) => (
              <TouchableOpacity
                key={filterType}
                style={{
                  backgroundColor: filter === filterType ? '#007AFF' : 'white',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: filter === filterType ? '#007AFF' : '#e0e0e0'
                }}
                onPress={() => setFilter(filterType)}
              >
                <Text style={{
                  color: filter === filterType ? 'white' : '#666',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {filterType}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Visitor List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {filteredVisitors.map((visitor, index) => (
            <TouchableOpacity
              key={visitor.id}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>
                    {visitor.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>
                    📞 {visitor.phone}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>
                    📅 {visitor.visitDate} at {visitor.visitTime}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    🎯 {visitor.purpose}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>
                      {getStatusIcon(visitor.status)}
                    </Text>
                    <Text style={{
                      color: getStatusColor(visitor.status),
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      fontSize: 12
                    }}>
                      {visitor.status}
                    </Text>
                  </View>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{
                    backgroundColor: getStatusColor(visitor.status),
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginBottom: 8
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                      {visitor.code}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#999' }}>
                    Tap for details
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </>
  );
}