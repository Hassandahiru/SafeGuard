import React from 'react';
import { FlatList, FlatListProps, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../atoms/Text';

export interface ListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  showBorder?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export function List<T>({
  data,
  renderItem,
  emptyMessage = 'No items found',
  showBorder = true,
  spacing = 'none',
  ...flatListProps
}: ListProps<T>) {
  const { theme } = useTheme();
  
  const containerStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: showBorder ? theme.borderRadius.md : 0,
    borderWidth: showBorder ? 1 : 0,
    borderColor: theme.colors.border.light,
    overflow: 'hidden' as const,
  };
  
  const spacingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  };
  
  const EmptyComponent = () => (
    <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
      <Text variant="body" color="secondary">
        {emptyMessage}
      </Text>
    </View>
  );

  return (
    <View style={containerStyle}>
      <FlatList
        data={data}
        renderItem={({ item, index }) => renderItem(item, index)}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={EmptyComponent}
        ItemSeparatorComponent={
          spacing !== 'none' 
            ? () => <View style={{ height: spacingMap[spacing] }} />
            : undefined
        }
        {...flatListProps}
      />
    </View>
  );
}