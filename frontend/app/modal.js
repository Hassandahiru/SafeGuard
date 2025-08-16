import React from "react";
import { Container, Card, Text, Button } from "../components/atoms";
import { router } from "expo-router";

export default function ModalScreen() {
  return (
    <Container padding="lg">
      <Text variant="h1" weight="bold" style={{ marginBottom: 24 }}>
        Modal Screen
      </Text>
      
      <Card variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
        <Text variant="body" style={{ marginBottom: 16 }}>
          This is an example modal screen that demonstrates stack navigation.
        </Text>
        
        <Button 
          title="Close Modal" 
          variant="primary" 
          onPress={() => router.back()}
        />
      </Card>
    </Container>
  );
}