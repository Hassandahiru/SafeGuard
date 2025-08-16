import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { Text } from '../atoms/Text';
import { Ionicons } from '@expo/vector-icons';

// 6.3" phone dimensions
const PHONE_WIDTH = 375;

interface VisitorEvent {
  id: string;
  type: 'visitor' | 'delivery' | 'maintenance';
  title: string;
  time: string;
  duration: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  status: 'pending' | 'approved' | 'arrived';
  details?: {
    location?: string;
    startsIn?: string;
    description?: string;
  };
}

interface ActionSheetProps {
  visible: boolean;
  event: VisitorEvent | null;
  onClose: () => void;
}

const ActionSheet: React.FC<ActionSheetProps> = ({ visible, event, onClose }) => {
  const translateY = useState(new Animated.Value(100))[0];
  const opacity = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
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
          toValue: 100,
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

  if (!event) return null;

  return (
    <View style={[styles.actionSheetContainer, { display: visible ? 'flex' : 'none' }]}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.actionSheet, { transform: [{ translateY }] }]}>
        <View style={styles.actionSheetTitle}>
          <Text style={styles.actionSheetDuration}>{event.duration}</Text>
          <View style={styles.actionSheetTitleText}>
            <Ionicons name={event.icon} size={24} color="#FFFFFF" />
          </View>
          <TouchableOpacity style={styles.actionSheetClose} onPress={onClose}>
            <Ionicons name="close" size={20} color="#657786" />
          </TouchableOpacity>
        </View>
        
        {event.details && (
          <View style={styles.eventDetails}>
            <View style={styles.eventDetailsItems}>
              {event.details.startsIn && (
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color="#657786" />
                  <Text style={styles.detailText}>{event.details.startsIn}</Text>
                </View>
              )}
              {event.details.location && (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color="#657786" />
                  <Text style={styles.detailText}>{event.details.location}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.actionSheetContent}>
          <Text style={styles.actionSheetEventTitle}>{event.title}</Text>
          {event.details?.description && (
            <Text style={styles.eventDescription}>{event.details.description}</Text>
          )}
        </View>
        
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              {event.status === 'pending' ? 'Approve' : event.status === 'approved' ? 'Approved' : 'Check In'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<VisitorEvent | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const todaysEvents: VisitorEvent[] = [
    {
      id: '1',
      type: 'delivery',
      title: 'Amazon Delivery',
      time: '12:00 PM',
      duration: '15 minutes',
      icon: 'cube-outline',
      color: '#49CE95',
      status: 'approved',
      details: {
        startsIn: 'Arriving now',
        location: 'Main Gate',
        description: 'Package delivery for apartment A101. Driver will need access to building lobby.'
      }
    },
    {
      id: '2',
      type: 'visitor',
      title: 'Sarah Johnson',
      time: '2:30 PM',
      duration: '1 hour',
      icon: 'person-outline',
      color: '#0D6FFA',
      status: 'pending',
      details: {
        startsIn: 'Starts in 2 hours',
        location: 'Apartment A101',
        description: 'Family visit scheduled. Please ensure visitor has proper identification upon arrival.'
      }
    },
    {
      id: '3',
      type: 'maintenance',
      title: 'Plumbing Service',
      time: '4:00 PM',
      duration: '2 hours',
      icon: 'build-outline',
      color: '#EC3582',
      status: 'approved',
      details: {
        startsIn: 'Starts in 4 hours',
        location: 'Apartment A101',
        description: 'Scheduled maintenance for kitchen sink repair. Service technician from ABC Plumbing.'
      }
    }
  ];

  const handleEventPress = (event: VisitorEvent) => {
    if (event.status === 'pending') {
      setSelectedEvent(event);
      setActionSheetVisible(true);
    }
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          <Text style={styles.mainTitle}>Today's Events</Text>
          
          {/* Search Box */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchField}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder=""
            />
            <View style={[
              styles.searchPlaceholder,
              (searchFocused || searchText) && styles.searchPlaceholderFocused
            ]}>
              <Ionicons 
                name="search" 
                size={16} 
                color="rgba(0,0,0,0.6)" 
                style={styles.searchIcon} 
              />
              {!searchFocused && !searchText && (
                <Text style={styles.searchPlaceholderText}>Search an event</Text>
              )}
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {todaysEvents.map((event, index) => (
            <TouchableOpacity
              key={event.id}
              style={styles.timelineItem}
              onPress={() => handleEventPress(event)}
              activeOpacity={0.7}
            >
              <View style={[styles.timelineIcon, { backgroundColor: event.color }]}>
                <Ionicons name={event.icon} size={24} color="#FFFFFF" />
                {index < todaysEvents.length - 1 && <View style={styles.timelineLine} />}
              </View>
              
              <View style={styles.timelineInfo}>
                <View style={styles.timelineDetails}>
                  <Text style={styles.timelineTime}>{event.time}</Text>
                  <Text style={styles.timelineDuration}>{event.duration}</Text>
                </View>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                {event.status === 'pending' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Needs Approval</Text>
                  </View>
                )}
              </View>
              
              {event.status === 'pending' && (
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color="rgba(0,0,0,0.3)" 
                  style={styles.chevron} 
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.menuItem, styles.currentMenuItem]}>
          <Ionicons name="list" size={26} color="#0D6FFA" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="calendar-outline" size={26} color="rgba(0,0,0,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Action Sheet */}
      <ActionSheet 
        visible={actionSheetVisible}
        event={selectedEvent}
        onClose={closeActionSheet}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: PHONE_WIDTH,
    margin: 36,
    marginHorizontal: 'auto',
    backgroundColor: '#F6F8FA',
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  mainContainer: {
    padding: 36,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 42,
  },
  searchBox: {
    position: 'relative',
  },
  searchField: {
    height: 42,
    width: '100%',
    paddingHorizontal: 16,
    paddingLeft: 48,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 40,
    fontSize: 16,
    color: '#000',
  },
  searchPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  searchPlaceholderFocused: {
    transform: [{ translateX: -82 }],
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholderText: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
    margin: 0,
  },
  timeline: {
    paddingHorizontal: 36,
    paddingBottom: 100,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 60,
    position: 'relative',
  },
  timelineIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    width: 2,
    height: 100,
    backgroundColor: '#DBE0E8',
    marginLeft: -1,
    zIndex: -1,
  },
  timelineInfo: {
    flex: 1,
    paddingTop: 8,
  },
  timelineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.65)',
    lineHeight: 20,
  },
  timelineDuration: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.65)',
    lineHeight: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    margin: 0,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  menuItem: {
    opacity: 0.6,
  },
  currentMenuItem: {
    opacity: 1,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 28,
    left: '50%',
    marginLeft: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  // Action Sheet Styles
  actionSheetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  overlayTouchable: {
    flex: 1,
  },
  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingBottom: 36,
  },
  actionSheetTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingVertical: 16,
    marginTop: 24,
  },
  actionSheetDuration: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.65)',
    fontWeight: '500',
  },
  actionSheetTitleText: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    alignItems: 'center',
    marginTop: 24,
  },
  eventDetailsItems: {
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.65)',
    marginLeft: 8,
  },
  actionSheetContent: {
    paddingHorizontal: 36,
    paddingVertical: 24,
  },
  actionSheetEventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  eventDescription: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.65)',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButtonContainer: {
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0D6FFA',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0D6FFA',
    fontSize: 16,
    fontWeight: '600',
  },
});