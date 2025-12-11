
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

export default function HelpScreen({ navigation }) { // Make sure navigation is in props
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Help & Instructions</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone NFC Tap</Text>
          <Text style={styles.instruction}>1. Go to Check-in screen</Text>
          <Text style={styles.instruction}>2. Tap "Virtual Card"</Text>
          <Text style={styles.instruction}>3. Select subject and room</Text>
          <Text style={styles.instruction}>4. Tap "Start NFC"</Text>
          <Text style={styles.instruction}>5. Hold phone near ESP32 reader</Text>
          <Text style={styles.note}>Note: iPhone cannot emulate NFC cards</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical NFC Card</Text>
          <Text style={styles.instruction}>1. Go to Register Card screen</Text>
          <Text style={styles.instruction}>2. Tap "Register Physical Card"</Text>
          <Text style={styles.instruction}>3. Tap card on ESP32</Text>
          <Text style={styles.instruction}>4. Card will be linked to your account</Text>
          <Text style={styles.instruction}>5. Tap card on ESP32 to check in</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Check-in</Text>
          <Text style={styles.instruction}>1. Go to Check-in screen</Text>
          <Text style={styles.instruction}>2. Select subject and room</Text>
          <Text style={styles.instruction}>3. Tap "Manual Check-in"</Text>
          <Text style={styles.instruction}>4. Attendance will be recorded</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.instruction}>• Make sure ESP32 is powered on</Text>
          <Text style={styles.instruction}>• Ensure WiFi connection is stable</Text>
          <Text style={styles.instruction}>• Android: Enable NFC in settings</Text>
          <Text style={styles.instruction}>• Check Firebase database connection</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  note: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
