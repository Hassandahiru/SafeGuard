import React from 'react';
import { Container } from '../atoms/Container';
import { Header } from '../organisms/Header';

export interface ScreenTemplateProps {
  title?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerRightComponent?: React.ReactNode;
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ScreenTemplate: React.FC<ScreenTemplateProps> = ({
  title,
  showHeader = false,
  showBackButton = false,
  onBackPress,
  headerRightComponent,
  children,
  scrollable = true,
  padding = 'md',
}) => {
  return (
    <>
      {showHeader && title && (
        <Header
          title={title}
          showBackButton={showBackButton}
          onBackPress={onBackPress}
          rightComponent={headerRightComponent}
        />
      )}
      <Container 
        padding={padding} 
        scrollable={scrollable}
        style={{ flex: 1 }}
      >
        {children}
      </Container>
    </>
  );
};