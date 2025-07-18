import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Loading } from '../atoms';
import { ListItem } from '../molecules';
import { frequentVisitorService } from '../../services';
import { useSocket } from '../../context/SocketContext';
import { VISITOR_RELATIONSHIPS } from '../../constants/ApiConstants';

interface FrequentVisitor {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notes?: string;
  created_at: string;
  visit_count: number;
  last_visit?: string;
}

interface FrequentVisitorListProps {
  onQuickInvite?: (visitor: FrequentVisitor) => void;
  onEdit?: (visitor: FrequentVisitor) => void;
  refreshTrigger?: number;
}

const FrequentVisitorList: React.FC<FrequentVisitorListProps> = ({
  onQuickInvite,
  onEdit,
  refreshTrigger
}) => {
  const [visitors, setVisitors] = useState<FrequentVisitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { removeFrequentVisitor } = useSocket();

  useEffect(() => {
    loadFrequentVisitors();
  }, [refreshTrigger]);

  const loadFrequentVisitors = async () => {
    try {
      setIsLoading(true);
      const response = await frequentVisitorService.getFrequentVisitors();
      if (response.success) {
        setVisitors(response.data || []);
      }
    } catch (error) {
      console.error('Error loading frequent visitors:', error);
      Alert.alert('Error', 'Failed to load frequent visitors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFrequentVisitors();
    setRefreshing(false);
  };

  const handleRemoveVisitor = async (visitor: FrequentVisitor) => {
    Alert.alert(
      'Remove Frequent Visitor',
      `Are you sure you want to remove ${visitor.name} from your frequent visitors?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use Socket.io for real-time updates
              removeFrequentVisitor(visitor.id);
              
              // Also use REST API as fallback
              await frequentVisitorService.removeFrequentVisitor(visitor.id);
              
              // Update local state
              setVisitors(prev => prev.filter(v => v.id !== visitor.id));
              
              Alert.alert('Success', 'Frequent visitor removed successfully');
            } catch (error) {
              console.error('Error removing frequent visitor:', error);
              Alert.alert('Error', 'Failed to remove frequent visitor');
            }
          }
        }
      ]
    );
  };

  const getRelationshipLabel = (relationship: string) => {
    const labels = {
      [VISITOR_RELATIONSHIPS.FAMILY]: 'Family',
      [VISITOR_RELATIONSHIPS.FRIEND]: 'Friend',
      [VISITOR_RELATIONSHIPS.COLLEAGUE]: 'Colleague',
      [VISITOR_RELATIONSHIPS.SERVICE_PROVIDER]: 'Service Provider',
      [VISITOR_RELATIONSHIPS.BUSINESS]: 'Business',
      [VISITOR_RELATIONSHIPS.OTHER]: 'Other'
    };
    return labels[relationship] || relationship;
  };

  const renderVisitorItem = ({ item }: { item: FrequentVisitor }) => {
    const subtitle = `${item.phone} • ${getRelationshipLabel(item.relationship)}`;
    const visitInfo = item.visit_count > 0 
      ? `${item.visit_count} visits${item.last_visit ? ` • Last: ${new Date(item.last_visit).toLocaleDateString()}` : ''}`
      : 'No visits yet';

    return (
      <ListItem
        title={item.name}
        subtitle={subtitle}
        description={visitInfo}
        onPress={() => onEdit?.(item)}
        rightActions={[
          {
            title: 'Quick Invite',
            onPress: () => onQuickInvite?.(item),
            color: '#007AFF',
            icon: 'person-add'
          },
          {
            title: 'Remove',
            onPress: () => handleRemoveVisitor(item),
            color: '#FF3B30',
            icon: 'trash'
          }
        ]}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Frequent Visitors</Text>
      <Text style={styles.emptySubtitle}>
        Add visitors you frequently invite to make future invitations easier
      </Text>
    </View>
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visitors}
        renderItem={renderVisitorItem}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={visitors.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FrequentVisitorList;