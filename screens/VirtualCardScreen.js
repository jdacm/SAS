import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  Vibration,
  ActivityIndicator,
  Platform
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { database } from '../firebaseConfig';
import { ref, set, onValue, off } from 'firebase/database';

export default function VirtualCardScreen({ user, route, navigation }) {
  const { cardId, subject, room } = route.params || {};
  const [virtualCardId, setVirtualCardId] = useState(cardId || '');
  const [nfcStatus, setNfcStatus] = useState('ready');
  const [emulationActive, setEmulationActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Initialize
  useEffect(() => {
    generateCardId();
    setupIoTListener();
    
    return () => {
      const scansRef = ref(database, 'iot/scans');
      off(scansRef);
    };
  }, []);

  const generateCardId = () => {
    if (virtualCardId) return;

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userIdPart = user?.uid?.substring(0, 4) || 'USER';
    const newCardId = `V${userIdPart}${timestamp.toString(36).toUpperCase().substring(4, 8)}${random}`;
    setVirtualCardId(newCardId);
  };

  const setupIoTListener = () => {
    if (!virtualCardId) return;

    const scansRef = ref(database, 'iot/scans');

    const unsubscribe = onValue(scansRef, (snapshot) => {
      if (!snapshot.exists()) return;

      snapshot.forEach((childSnapshot) => {
        const scan = childSnapshot.val();
        if (scan.nfcUid === virtualCardId && scan.status === 'pending') {
          processIoTScan(childSnapshot.key, scan);
        }
      });
    });

    return unsubscribe;
  };

  const processIoTScan = async (scanId, scan) => {
    Vibration.vibrate([100, 50, 100]);
    setTapCount(prev => prev + 1);

    try {
      // Record attendance
      const attendanceRef = ref(database, '/attendance');
      await set(attendanceRef.push(), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        nfcUid: virtualCardId,
        timestamp: Date.now(),
        subject: subject || 'General',
        room: room || 'Room A',
        method: 'virtual_nfc',
        type: 'virtual_checkin',
        isVirtual: true,
        deviceId: scan.deviceId || 'ESP32-NFC',
        deviceLocation: scan.location || 'Room A',
        status: 'success',
        scanId: scanId
      });

      // Update scan status
      const scanRef = ref(database, `iot/scans/${scanId}`);
      await set(scanRef, {
        ...scan,
        status: 'processed',
        processedAt: Date.now(),
        userId: user.uid,
        userName: user.displayName
      });

      setNfcStatus('success');
      
      Alert.alert(
        '✅ Attendance Recorded',
        `NFC tap successful!\n\nDevice: ${scan.deviceId || 'Unknown'}`,
        [
          {
            text: 'Done',
            onPress: () => {
              setNfcStatus('ready');
              setEmulationActive(false);
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to record check-in.');
      setNfcStatus('ready');
    }
  };

  const startNFC = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'iOS Limitation',
        'iPhone cannot emulate NFC cards. Please use a physical NFC card instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    setEmulationActive(true);
    setNfcStatus('active');
    startPulseAnimation();

    Alert.alert(
      'NFC Active',
      'Hold your phone near the ESP32 NFC reader.',
      [{ text: 'OK' }]
    );
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopNFC = () => {
    setEmulationActive(false);
    setNfcStatus('ready');
    pulseAnim.stopAnimation();
  };

  // In VirtualCardScreen.js, add this function:
const emulatePhysicalCard = async () => {
  // Get user's registered physical card UID
  const physicalUid = await getUserPhysicalCard(); // Fetch from Firebase
  
  if (!physicalUid) {
    Alert.alert(
      'No Physical Card',
      'Register a physical card first to use phone NFC emulation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Register Card', 
          onPress: () => navigation.navigate('RegisterPhysicalCard')
        }
      ]
    );
    return;
  }

  // Try phone NFC emulation (limited on most devices)
  try {
    const NfcManager = require('react-native-nfc-manager').default;
    
    Alert.alert(
      'Phone NFC Emulation',
      `Trying to emulate card: ${physicalUid}\n\nNote: Most phones cannot emulate exact UIDs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Try Anyway',
          onPress: async () => {
            // For Android with HCE support
            const result = await NfcManager.registerTagEvent();
            // This is complex and device-dependent
          }
        }
      ]
    );
    
  } catch (error) {
    // Fallback: Use Firebase simulation
    Alert.alert(
      'Using Virtual Simulation',
      'Phone NFC emulation not available. Using virtual simulation instead.',
      [
        { text: 'OK', onPress: () => simulateVirtualTap() }
      ]
    );
  }
};

  if (!user || !user.uid) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please login first</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Phone NFC Tap</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>
          {emulationActive
            ? 'Hold phone near ESP32 reader'
            : 'Start NFC to tap your phone'
          }
        </Text>

        {/* Virtual NFC Card Display */}
        <Animated.View 
          style={[
            styles.nfcCard,
            { transform: [{ scale: pulseAnim }] },
            emulationActive && styles.cardActive,
            nfcStatus === 'success' && styles.cardSuccess
          ]}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>📱</Text>
          </View>

          <Text style={styles.cardTitle}>
            {emulationActive ? 'NFC ACTIVE' : 'VIRTUAL NFC'}
          </Text>

          <Text style={styles.cardId}>{virtualCardId}</Text>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName}</Text>
          </View>

          <View style={styles.cardStatus}>
            <View style={[
              styles.statusDot,
              nfcStatus === 'active' && styles.statusDotActive,
              nfcStatus === 'success' && styles.statusDotSuccess,
            ]} />
            <Text style={styles.statusText}>
              {nfcStatus === 'active' ? 'ACTIVE' : 'READY'}
            </Text>
          </View>
        </Animated.View>

        {/* Status Display */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBox,
            nfcStatus === 'active' && styles.statusBoxActive,
            nfcStatus === 'success' && styles.statusBoxSuccess,
          ]}>
            <Text style={styles.statusMessage}>
              {nfcStatus === 'active' ? '📱 NFC Active - Tap phone on reader' :
               nfcStatus === 'success' ? '✅ Attendance Recorded!' :
               'Ready for NFC tap'}
            </Text>
          </View>
        </View>

        {/* Check-in Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Check-in Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subject:</Text>
            <Text style={styles.detailValue}>{subject || 'General'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Room:</Text>
            <Text style={styles.detailValue}>{room || 'Room A'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!emulationActive ? (
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={startNFC}
            >
              <Text style={styles.buttonText}>Start NFC</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, styles.stopButton]}
              onPress={stopNFC}
            >
              <Text style={styles.buttonText}>Stop NFC</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  instructions: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  nfcCard: {
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardActive: {
    borderColor: '#06b6d4',
  },
  cardSuccess: {
    borderColor: '#10b981',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardIconText: {
    fontSize: 40,
    color: '#fff',
  },
  cardTitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  cardId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
    marginBottom: 16,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#06b6d4',
  },
  statusDotSuccess: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignItems: 'center',
  },
  statusBoxActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  statusBoxSuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#06b6d4',
  },
  secondaryButton: {
    backgroundColor: '#64748b',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    marginBottom: 20,
  },
});
