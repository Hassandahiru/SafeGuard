import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, StatusBar, Animated } from "react-native";
import { Text } from "../../components/atoms/Text";
import { Button } from "../../components/atoms/Button";
import { useAuth } from "../../context/AuthContext";
import { useVisitor } from "../../context/VisitorContext";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { NewVisitModal } from "../../components/visitors/NewVisitModal";
import { visitorService } from "../../services/visitorService";

// Visitor data with approval requirements
const pendingVisitors = [
  {
    id: 'VS105',
    name: 'Sarah Johnson',
    time: 'Tomorrow at 11:00 AM',
    status: 'PENDING',
    purpose: 'Family Visit',
    phone: '+1 (555) 123-4567',
    expectedDuration: '2 hours',
    notes: 'Visiting for family dinner. Will be bringing children.',
    requiresApproval: true
  }
];

const approvedVisitors = [
  {
    id: 'VS104',
    name: 'Alice Cooper',
    time: 'Today at 3:00 PM',
    status: 'APPROVED',
    purpose: 'Business Meeting',
    phone: '+1 (555) 987-6543',
    expectedDuration: '1 hour',
    notes: 'Here to discuss the quarterly reports.',
    requiresApproval: false
  }
];

// Visit Summary Modal Component
const VisitSummaryModal = ({ visible, visitor, onClose, onApprove, onDecline }) => {
  const translateY = useState(new Animated.Value(300))[0];
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visitor || !visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }}>
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity
      }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      
      <Animated.View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        transform: [{ translateY }]
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>{visitor.expectedDuration}</Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Ionicons name="person-circle" size={32} color="#007AFF" />
          </View>
          <TouchableOpacity onPress={onClose} style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(0,0,0,0.1)',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Visitor Details */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="time-outline" size={16} color="#666" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: '#666' }}>{visitor.time}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="call-outline" size={16} color="#666" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: '#666' }}>{visitor.phone}</Text>
          </View>
        </View>

        {/* Visit Summary */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
            {visitor.name}
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 }}>
            Purpose: {visitor.purpose}\n\n{visitor.notes}
          </Text>
        </View>

        {/* Action Buttons */}
        {visitor.requiresApproval && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#EF4444',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center'
              }}
              onPress={() => onDecline(visitor)}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 16 }}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: '#007AFF',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center'
              }}
              onPress={() => onApprove(visitor)}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default function Index() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [realVisitors, setRealVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { showNewVisitModal: isNewVisitModalVisible, closeNewVisitModal, openNewVisitModal } = useVisitor();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      setLoading(true);
      const response = await visitorService.getUserInvitations({
        page: 1,
        limit: 10,
        status: 'pending,confirmed,active'
      });
      
      if (response.success) {
        setRealVisitors(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleContactSelect = () => {
    openNewVisitModal();
  };

  const handleNewVisit = () => {
    openNewVisitModal();
  };

  const handleVisitCreated = (visitData) => {
    console.log('New visit created:', visitData);
    loadVisitors(); // Reload the visitor list
  };

  const handleManualEntry = () => {
    console.log('Manual entry');
  };

  const handleEventMode = () => {
    console.log('Event mode');
  };

  const handleVisitorPress = (visitor) => {
    if (visitor.requiresApproval) {
      setSelectedVisitor(visitor);
      setModalVisible(true);
    }
  };

  const handleApprove = (visitor) => {
    console.log('Approved visitor:', visitor.name);
    setModalVisible(false);
    // Here you would call your API to approve the visitor
  };

  const handleDecline = (visitor) => {
    console.log('Declined visitor:', visitor.name);
    setModalVisible(false);
    // Here you would call your API to decline the visitor
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedVisitor(null), 300);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header with Time */}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' }}>
                Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}
                {user && `, ${user.first_name || user.name}`}
              </Text>
              <Text style={{ fontSize: 16, color: '#666', marginTop: 4 }}>
                {formatDate(currentTime)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#007AFF' }}>
                {formatTime(currentTime)}
              </Text>
              <View style={{ 
                backgroundColor: '#10B981', 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 12, 
                marginTop: 4 
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>ONLINE</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={{ padding: 20 }}>
        
        {/* Quick Actions Grid */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' }}>
            Quick Actions
          </Text>
          
          <View style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
            <Button
              title="From Contacts"
              variant="primary"
              size="large"
              icon="people"
              onPress={handleContactSelect}
              style={{ flex: 1, paddingVertical: 20 }}
            />
            
            <Button
              title="Manual Entry"
              variant="outline"
              size="large"
              icon="create"
              onPress={handleManualEntry}
              style={{ flex: 1, paddingVertical: 20 }}
            />
          </View>
          
          <Button
            title="Event Mode"
            variant="primary"
            size="large"
            icon="calendar"
            onPress={handleEventMode}
            style={{ 
              backgroundColor: '#10B981',
              shadowColor: '#10B981',
              paddingVertical: 20,
            }}
            fullWidth
          />
        </View>

        {/* Stats Card */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
            Today's Stats
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F59E0B' }}>{pendingVisitors.length}</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>Pending</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10B981' }}>{approvedVisitors.length}</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>Approved</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#EF4444' }}>0</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Visitors */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 12, 
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
            Upcoming Visitors
          </Text>
          
          {/* Approved Visitors */}
          {approvedVisitors.map((visitor) => (
            <View key={visitor.id} style={{ borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>{visitor.name}</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>{visitor.time}</Text>
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>APPROVED - {visitor.id}</Text>
            </View>
          ))}
          
          {/* Pending Visitors - Clickable */}
          {pendingVisitors.map((visitor) => (
            <TouchableOpacity 
              key={visitor.id} 
              onPress={() => handleVisitorPress(visitor)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500' }}>{visitor.name}</Text>
                <Text style={{ fontSize: 14, color: '#666' }}>{visitor.time}</Text>
                <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>PENDING - {visitor.id}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button for Testing */}
        <View style={{ padding: 20, paddingTop: 0 }}>
          <Button
            title="Logout (Test)"
            onPress={logout}
            variant="danger"
            icon="log-out"
          />
        </View>
      </View>
    </ScrollView>
    
    {/* Visit Summary Modal */}
    <VisitSummaryModal
      visible={modalVisible}
      visitor={selectedVisitor}
      onClose={closeModal}
      onApprove={handleApprove}
      onDecline={handleDecline}
    />

    {/* New Visit Modal */}
    <NewVisitModal
      visible={isNewVisitModalVisible}
      onClose={closeNewVisitModal}
      onVisitCreated={handleVisitCreated}
    />
    </>
  );
}