import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  Alert, 
  StyleSheet, 
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { Picker } from '@react-native-picker/picker';
import { database } from '../firebaseConfig';
import { ref, push, get } from 'firebase/database';

const ROOMS = ['Room A', 'Room B', 'Room C', 'Room D', 'Auditorium', 'Lab 1', 'Lab 2'];
const SUBJECTS = [
  'Math 101',
  'Physics 101',
  'Chemistry 101',
  'Computer Science 101',
  'English 101',
  'History 101',
  'Biology 101',
  'Engineering 101'
];

export default function CheckInScreen({ user, navigation }) {
  const [subject, setSubject] = useState('Math 101');
  const [room, setRoom] = useState('Room A');
  const [loading, setLoading] = useState(false);
  const [showMobileCheckIn, setShowMobileCheckIn] = useState(false);
  const [virtualNfcId, setVirtualNfcId] = useState('');
  const [userVirtualIds, setUserVirtualIds] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadUserVirtualIds();
  }, [user]);

  const loadUserVirtualIds = async () => {
    if (!user) return;
    
    try {
      const cardsRef = ref(database, 'cardMappings');
      const snapshot = await get(cardsRef);
      if (snapshot.exists()) {
        const virtualIds = [];
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.userId === user.uid && data.isVirtual) {
            virtualIds.push({
              nfcUid: childSnapshot.key,
              ...data
            });
          }
        });
        setUserVirtualIds(virtualIds);
      }
    } catch (error) {
      console.error('Error loading virtual IDs:', error);
    }
  };

  const handleManualCheckIn = () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setLoading(true);
    try {
      const attendanceRef = ref(database, '/attendance');
      push(attendanceRef, {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        timestamp: Date.now(),
        subject,
        room,
        method: 'manual',
        type: 'manual_checkin'
      })
        .then(() => {
          Alert.alert(
            'Success',
            `Check-in recorded for ${subject} in ${room}`,
            [{ text: 'OK' }]
          );
          setLoading(false);
        })
        .catch(err => {
          Alert.alert('Error', err.message);
          setLoading(false);
        });
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleMobileCheckIn = async (selectedVirtualId = null) => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setLoading(true);
    setScanning(true);

    try {
      let nfcUidToUse = selectedVirtualId || virtualNfcId;
      
      if (!nfcUidToUse && userVirtualIds.length > 0) {
        nfcUidToUse = userVirtualIds[0].nfcUid;
      }

      if (!nfcUidToUse) {
        Alert.alert('Error', 'No virtual NFC ID found. Please generate one first.');
        setLoading(false);
        setScanning(false);
        return;
      }

      setTimeout(async () => {
        try {
          const attendanceRef = ref(database, '/attendance');
          await push(attendanceRef, {
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
            nfcUid: nfcUidToUse,
            timestamp: Date.now(),
            subject,
            room,
            method: 'mobile_nfc',
            type: 'mobile_checkin',
            isVirtual: true
          });

          const cardRef = ref(database, `cardMappings/${nfcUidToUse}`);
          const snapshot = await get(cardRef);
          if (snapshot.exists()) {
            const currentData = snapshot.val();
            await push(cardRef, { 
              ...currentData, 
              lastUsed: Date.now(),
              lastSubject: subject,
              lastRoom: room
            });
          }

          Alert.alert(
            '✅ Check-in Successful!',
            `Mobile check-in recorded for ${subject} in ${room}\n\nVirtual NFC ID: ${nfcUidToUse}`,
            [{ 
              text: 'OK', 
              onPress: () => {
                setShowMobileCheckIn(false);
                setScanning(false);
              }
            }]
          );

        } catch (error) {
          Alert.alert('Error', error.message);
        } finally {
          setLoading(false);
          setScanning(false);
        }
      }, 1500);

    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      setScanning(false);
    }
  };

  const simulateNFCTap = (virtualId) => {
    Alert.alert(
      'Simulate NFC Tap',
      `Use virtual NFC ID: ${virtualId}\n\nThis simulates tapping your phone on the reader.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check In Now', 
          onPress: () => handleMobileCheckIn(virtualId)
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Text style={styles.title}>Check-in Options</Text>
          <Text style={styles.subtitle}>Choose your preferred check-in method</Text>
          
          <View style={styles.methodsContainer}>
            <Pressable 
              style={styles.methodCard}
              onPress={() => setShowMobileCheckIn(true)}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#06b6d4' }]}>
                <Text style={styles.methodIconText}>📱</Text>
              </View>
              <Text style={styles.methodTitle}>Mobile Check-in</Text>
              <Text style={styles.methodDescription}>
                Use your phone as virtual NFC card
              </Text>
              <Text style={styles.methodHint}>
                Tap to check in with virtual ID
              </Text>
            </Pressable>

            <Pressable 
              style={styles.methodCard}
              onPress={handleManualCheckIn}
              disabled={loading}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#10b981' }]}>
                <Text style={styles.methodIconText}>📝</Text>
              </View>
              <Text style={styles.methodTitle}>Manual Check-in</Text>
              <Text style={styles.methodDescription}>
                Enter details manually
              </Text>
              <Text style={styles.methodHint}>
                For administrators
              </Text>
            </Pressable>

            <Pressable 
              style={styles.methodCard}
              onPress={() => navigation.navigate('Home')}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.methodIconText}>QR</Text>
              </View>
              <Text style={styles.methodTitle}>QR Code</Text>
              <Text style={styles.methodDescription}>
                Show QR code to scanner
              </Text>
              <Text style={styles.methodHint}>
                Go to Home screen
              </Text>
            </Pressable>

            <Pressable 
              style={styles.methodCard}
              onPress={() => navigation.navigate('RegisterCard')}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.methodIconText}>💳</Text>
              </View>
              <Text style={styles.methodTitle}>Physical Card</Text>
              <Text style={styles.methodDescription}>
                Use registered NFC card
              </Text>
              <Text style={styles.methodHint}>
                Register cards first
              </Text>
            </Pressable>
          </View>

          {userVirtualIds.length > 0 && (
            <View style={styles.virtualIdsSection}>
              <Text style={styles.sectionTitle}>Your Virtual NFC IDs</Text>
              <Text style={styles.sectionSubtitle}>
                Tap any ID to check in instantly
              </Text>
              
              {userVirtualIds.map((virtualId, index) => (
                <Pressable 
                  key={index}
                  style={styles.virtualIdCard}
                  onPress={() => simulateNFCTap(virtualId.nfcUid)}
                >
                  <View style={styles.virtualIdHeader}>
                    <Text style={styles.virtualIdText}>{virtualId.nfcUid}</Text>
                    <View style={styles.virtualBadge}>
                      <Text style={styles.virtualBadgeText}>VIRTUAL</Text>
                    </View>
                  </View>
                  {virtualId.lastUsed ? (
                    <Text style={styles.virtualIdLastUsed}>
                      Last used: {new Date(virtualId.lastUsed).toLocaleDateString()}
                    </Text>
                  ) : (
                    <Text style={styles.virtualIdNew}>Never used</Text>
                  )}
                  <Text style={styles.virtualIdTapHint}>
                    ↓ Tap to check in now
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.manualForm}>
            <Text style={styles.formTitle}>Manual Check-in Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={subject}
                  onValueChange={setSubject}
                  style={styles.picker}
                  dropdownIconColor="#64748b"
                >
                  {SUBJECTS.map((sub, index) => (
                    <Picker.Item key={index} label={sub} value={sub} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Room</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={room}
                  onValueChange={setRoom}
                  style={styles.picker}
                  dropdownIconColor="#64748b"
                >
                  {ROOMS.map((rm, index) => (
                    <Picker.Item key={index} label={rm} value={rm} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleManualCheckIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : 'Manual Check In'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showMobileCheckIn}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMobileCheckIn(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {scanning ? 'Checking In...' : 'Mobile Check-in'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Using virtual NFC ID for check-in
            </Text>
            
            {scanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#06b6d4" />
                <Text style={styles.scanningText}>
                  Simulating NFC tap...
                </Text>
                <Text style={styles.scanningHint}>
                  (In real scenario, tap phone on reader)
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Check-in Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Method:</Text>
                    <Text style={styles.infoValue}>Mobile NFC</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Subject:</Text>
                    <Text style={styles.infoValue}>{subject}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Room:</Text>
                    <Text style={styles.infoValue}>{room}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Time:</Text>
                    <Text style={styles.infoValue}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                
                {userVirtualIds.length > 0 && (
                  <View style={styles.virtualIdSelector}>
                    <Text style={styles.selectorTitle}>Select Virtual ID:</Text>
                    <Picker
                      selectedValue={virtualNfcId}
                      onValueChange={setVirtualNfcId}
                      style={styles.selectorPicker}
                    >
                      <Picker.Item label="Select Virtual ID" value="" />
                      {userVirtualIds.map((id, index) => (
                        <Picker.Item 
                          key={index} 
                          label={`${id.nfcUid} ${id.lastUsed ? '(Used)' : '(New)'}`} 
                          value={id.nfcUid} 
                        />
                      ))}
                    </Picker>
                  </View>
                )}
                
                <Pressable 
                  style={[styles.modalButton, styles.checkInButton]}
                  onPress={() => handleMobileCheckIn()}
                  disabled={loading || scanning}
                >
                  <Text style={styles.modalButtonText}>
                    {loading ? 'Processing...' : 'Check In Now'}
                  </Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={() => setShowMobileCheckIn(false)}
                  disabled={scanning}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </Pressable>
                
                {!userVirtualIds.length && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ No virtual NFC IDs found.{'\n'}
                      Please generate one in Register Card screen first.
                    </Text>
                    <Pressable 
                      style={styles.navigationButton}
                      onPress={() => {
                        setShowMobileCheckIn(false);
                        navigation.navigate('RegisterCard');
                      }}
                    >
                      <Text style={styles.navigationButtonText}>Go to Register Card</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  inner: { 
    flex: 1,
    paddingBottom: 30,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: { 
    color: '#64748b', 
    marginBottom: 24,
    fontSize: 15,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  methodCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  methodHint: {
    fontSize: 10,
    color: '#06b6d4',
    fontWeight: '500',
    textAlign: 'center',
  },
  virtualIdsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  virtualIdCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  virtualIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  virtualIdText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06b6d4',
    fontFamily: 'monospace',
  },
  virtualBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  virtualBadgeText: {
    fontSize: 10,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  virtualIdLastUsed: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  virtualIdNew: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 4,
  },
  virtualIdTapHint: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  manualForm: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 40,
  },
  scanningText: {
    fontSize: 16,
    color: '#06b6d4',
    marginTop: 16,
    marginBottom: 8,
  },
  scanningHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  virtualIdSelector: {
    marginBottom: 20,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  selectorPicker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInButton: {
    backgroundColor: '#06b6d4',
  },
  closeButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 12,
    lineHeight: 20,
  },
  navigationButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});