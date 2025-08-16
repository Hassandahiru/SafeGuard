import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ScreenTemplate } from './ScreenTemplate';
import { List } from '../molecules/List';
import { ListItem } from '../molecules/ListItem';
import { Text } from '../atoms/Text';
import { ErrorState } from '../atoms/ErrorState';
import { Loading } from '../atoms/Loading';

export interface Visitor {
  id: string;
  name: string;
  phone?: string;
  status: 'pending' | 'approved' | 'expired' | 'used';
  visitDate: string;
  visitTime?: string;
  code?: string;
}

export interface VisitorListTemplateProps {
  title: string;
  visitors: Visitor[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onVisitorPress?: (visitor: Visitor) => void;
  emptyMessage?: string;
  showHeader?: boolean;
  headerRightComponent?: React.ReactNode;
}

export const VisitorListTemplate: React.FC<VisitorListTemplateProps> = ({
  title,
  visitors,
  loading = false,
  error,
  onRetry,
  onVisitorPress,
  emptyMessage = 'No visitors found',
  showHeader = true,
  headerRightComponent,
}) => {
  const { theme } = useTheme();

  const getStatusColor = (status: Visitor['status']) => {
    switch (status) {
      case 'approved': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'expired': return theme.colors.error;
      case 'used': return theme.colors.secondary;
      default: return theme.colors.text;
    }
  };

  const renderVisitor = (visitor: Visitor) => (
    <ListItem
      key={visitor.id}
      title={visitor.name}
      subtitle={`${visitor.visitDate}${visitor.visitTime ? ` at ${visitor.visitTime}` : ''}`}
      onPress={() => onVisitorPress?.(visitor)}
      rightComponent={
        <View style={{ alignItems: 'flex-end' }}>
          <Text 
            variant="caption" 
            style={{ 
              color: getStatusColor(visitor.status),
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          >
            {visitor.status}
          </Text>
          {visitor.code && (
            <Text variant="caption" color="secondary">
              {visitor.code}
            </Text>
          )}
        </View>
      }
    />
  );

  if (loading) {
    return (
      <ScreenTemplate title={title} showHeader={showHeader}>
        <Loading message="Loading visitors..." />
      </ScreenTemplate>
    );
  }

  if (error) {
    return (
      <ScreenTemplate title={title} showHeader={showHeader}>
        <ErrorState
          message={error}
          onRetry={onRetry}
        />
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate 
      title={title} 
      showHeader={showHeader}
      headerRightComponent={headerRightComponent}
    >
      <List
        data={visitors}
        renderItem={renderVisitor}
        emptyMessage={emptyMessage}
        showBorder={true}
      />
    </ScreenTemplate>
  );
};