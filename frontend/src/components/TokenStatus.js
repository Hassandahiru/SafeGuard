// TokenStatus Component - Shows current token status and allows manual refresh

import React, { useState, useEffect } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonBadge,
  IonToast,
  IonSpinner
} from '@ionic/react';
import {
  refreshOutline,
  checkmarkCircle,
  warningOutline,
  timeOutline,
  alertCircle
} from 'ionicons/icons';
import { useAuth } from '../hooks/useAuth';

const TokenStatus = () => {
  const { tokenInfo, refreshToken, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

  if (!isAuthenticated || !tokenInfo) {
    return null;
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      await refreshToken();
      setToastMessage('Token refreshed successfully');
      setToastColor('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to refresh token: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTokenStatusColor = () => {
    if (!tokenInfo.isValid) return 'danger';
    if (tokenInfo.minutesUntilExpiry < 15) return 'warning';
    if (tokenInfo.minutesUntilExpiry < 60) return 'medium';
    return 'success';
  };

  const getTokenStatusIcon = () => {
    if (!tokenInfo.isValid) return alertCircle;
    if (tokenInfo.minutesUntilExpiry < 15) return warningOutline;
    return checkmarkCircle;
  };

  const formatTimeUntilExpiry = () => {
    const minutes = tokenInfo.minutesUntilExpiry;
    
    if (minutes < 1) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Session Status</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem lines="none">
            <IonIcon 
              icon={getTokenStatusIcon()} 
              color={getTokenStatusColor()}
              slot="start" 
            />
            <IonLabel>
              <h3>Authentication Token</h3>
              <p>
                {tokenInfo.isValid ? 'Valid' : 'Expired'} • 
                Expires in {formatTimeUntilExpiry()}
              </p>
            </IonLabel>
            <IonBadge 
              color={getTokenStatusColor()} 
              slot="end"
            >
              {tokenInfo.isValid ? 'Active' : 'Expired'}
            </IonBadge>
          </IonItem>

          <IonItem lines="none">
            <IonIcon icon={timeOutline} slot="start" />
            <IonLabel>
              <h3>Expires At</h3>
              <p>{tokenInfo.expiresAt.toLocaleString()}</p>
            </IonLabel>
          </IonItem>

          <div style={{ marginTop: '16px' }}>
            <IonButton
              expand="block"
              fill="outline"
              onClick={handleRefreshToken}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Refreshing...
                </>
              ) : (
                <>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Refresh Token
                </>
              )}
            </IonButton>
          </div>

          {tokenInfo.minutesUntilExpiry < 15 && tokenInfo.isValid && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              background: 'var(--ion-color-warning-tint)',
              borderRadius: '8px',
              border: '1px solid var(--ion-color-warning)'
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: '14px',
                color: 'var(--ion-color-warning-contrast)'
              }}>
                ⚠️ Your session will expire soon. Consider refreshing your token.
              </p>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        color={toastColor}
      />
    </>
  );
};

export default TokenStatus;