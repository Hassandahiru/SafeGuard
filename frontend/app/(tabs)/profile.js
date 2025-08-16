import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Switch } from "react-native";

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  const profileStats = [
    { label: 'Total Visitors', value: '247', icon: '👥', color: '#007AFF' },
    { label: 'This Month', value: '38', icon: '📅', color: '#10B981' },
    { label: 'Pending', value: '5', icon: '⏳', color: '#F59E0B' },
    { label: 'Active Codes', value: '12', icon: '🔐', color: '#8B5CF6' }
  ];

  const settingsMenu = [
    {
      title: 'Estate Settings',
      items: [
        { label: 'Estate Name', value: 'Sunset Heights', icon: '🏢' },
        { label: 'Security Code', value: '****', icon: '🔒' },
        { label: 'Visit Duration', value: '2 hours', icon: '⏰' },
      ]
    },
    {
      title: 'WhatsApp Integration',
      items: [
        { label: 'Phone Number', value: '+234 703 310 86608', icon: '📱' },
        { label: 'Message Template', value: 'Customize', icon: '💬' },
        { label: 'Auto Send', value: 'Enabled', icon: '🚀' },
      ]
    },
    {
      title: 'Support & Info',
      items: [
        { label: 'Help Center', value: '', icon: '❓' },
        { label: 'Contact Support', value: '', icon: '💬' },
        { label: 'Privacy Policy', value: '', icon: '🔐' },
        { label: 'App Version', value: 'v1.0.0', icon: '📱' },
      ]
    }
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{ 
          backgroundColor: 'white', 
          paddingTop: 50, 
          paddingBottom: 30, 
          paddingHorizontal: 20,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#007AFF',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: '#007AFF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4
            }}>
              <Text style={{ fontSize: 40, color: 'white', fontWeight: 'bold' }}>JD</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>
              John Doe
            </Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 4 }}>
              Estate Manager
            </Text>
            <View style={{ 
              backgroundColor: '#10B981', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 16 
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                PREMIUM ACCOUNT
              </Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {/* Stats Grid */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' }}>
              Your Stats
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {profileStats.map((stat, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 16,
                    flex: 1,
                    minWidth: '45%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2
                  }}
                >
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</Text>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold', 
                    color: stat.color,
                    marginBottom: 4 
                  }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quick Settings */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' }}>
              Quick Settings
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>🔔</Text>
                <Text style={{ fontSize: 16, fontWeight: '500' }}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                thumbColor={notifications ? 'white' : 'white'}
              />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>⚡</Text>
                <Text style={{ fontSize: 16, fontWeight: '500' }}>Auto-approve Contacts</Text>
              </View>
              <Switch
                value={autoApprove}
                onValueChange={setAutoApprove}
                trackColor={{ false: '#e0e0e0', true: '#10B981' }}
                thumbColor={autoApprove ? 'white' : 'white'}
              />
            </View>
          </View>

          {/* Settings Menu */}
          {settingsMenu.map((section, sectionIndex) => (
            <View
              key={sectionIndex}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' }}>
                {section.title}
              </Text>
              
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: itemIndex < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: '#f0f0f0'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 18, marginRight: 12 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#1a1a1a' }}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.value && (
                      <Text style={{ fontSize: 14, color: '#666', marginRight: 8 }}>
                        {item.value}
                      </Text>
                    )}
                    <Text style={{ fontSize: 16, color: '#007AFF' }}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Logout Button */}
          <TouchableOpacity
            style={{
              backgroundColor: 'white',
              borderWidth: 2,
              borderColor: '#EF4444',
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              marginBottom: 40
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold' }}>
              🚪 Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}