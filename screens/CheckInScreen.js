// screens/CheckInScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { Picker } from '@react-native-picker/picker';
import { database } from '../firebaseConfig';
import { ref, push, get, set } from 'firebase/database';

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
  const [userVirtualIds, setUserVirtualIds] = useState([]);
  const [selectedVirtualId, setSelectedVirtualId] = useState('');
  const [showVirtualIdPicker, setShowVirtualIdPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserVirtualIds();
    }
  }, [user]);

  useEffect(() => {
    if (userVirtualIds.length > 0 && !selectedVirtualId) {
      setSelectedVirtualId(userVirtualIds[0].cardId);
    }
  }, [userVirtualIds]);

  const loadUserVirtualIds = async () => {
    if (!user) return;

    try {
      const virtualIds = [];
      
      // Check virtualCards collection
      const virtualCardsRef = ref(database, 'virtualCards');
      const virtualCardsSnapshot = await get(virtualCardsRef);
      
      if (virtualCardsSnapshot.exists()) {
        virtualCardsSnapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          const cardId = childSnapshot.key;
          
          if (data.userId === user.uid) {
            virtualIds.push({
              id: childSnapshot.key,
              cardId: cardId,
              name: data.name || 'Virtual ID',
              linkedAt: data.linkedAt || Date.now(),
              ...data
            });
          }
        });
      }
      
      // Also check userCards collection
      const userCardsRef = ref(database, 'userCards');
      const userCardsSnapshot = await get(userCardsRef);
      
      if (userCardsSnapshot.exists()) {
        userCardsSnapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          
          if (data.userId === user.uid && data.cardType === 'virtual') {
            const existing = virtualIds.find(v => v.cardId === data.cardId);
            if (!existing) {
              virtualIds.push({
                id: childSnapshot.key,
                cardId: data.cardId,
                name: data.name || 'Virtual ID',
                linkedAt: data.linkedAt || Date.now(),
                ...data
              });
            }
          }
        });
      }
      
      setUserVirtualIds(virtualIds);
      
      if (virtualIds.length > 0 && !selectedVirtualId) {
        setSelectedVirtualId(virtualIds[0].cardId);
      }
      
    } catch (error) {
      console.error('Error loading virtual IDs:', error);
      Alert.alert('Error', 'Failed to load virtual IDs');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserVirtualIds();
    setRefreshing(false);
  };

  const openVirtualCard = () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (userVirtualIds.length > 0) {
      navigation.navigate('VirtualCard', {
        cardId: selectedVirtualId || userVirtualIds[0].cardId,
        subject,
        room
      });
    } else {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userIdPart = user.uid.substring(0, 4);
      const cardId = `V-${userIdPart}-${timestamp.toString(36).toUpperCase().substring(4, 8)}-${random}`;
      
      navigation.navigate('VirtualCard', {
        cardId,
        subject,
        room
      });
    }
  };

  const quickVirtualCheckIn = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (userVirtualIds.length === 0) {
      Alert.alert(
        'No Virtual ID',
        'You need to create a virtual ID first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Virtual ID', 
            onPress: () => navigation.navigate('RegisterCard')
          }
        ]
      );
      return;
    }

    const virtualIdToUse = selectedVirtualId || userVirtualIds[0].cardId;
    
    setLoading(true);

    try {
      // Record attendance
      const attendanceRef = ref(database, '/attendance');
      const newAttendanceRef = push(attendanceRef);
      
      await set(newAttendanceRef, {
        userId: user.uid,
        userName: user.displayName || 'User',
        userEmail: user.email,
        nfcUid: virtualIdToUse,
        timestamp: Date.now(),
        subject,
        room,
        method: 'virtual_nfc',
        type: 'quick_checkin',
        isVirtual: true,
        cardType: 'virtual',
        device: 'Mobile App',
        location: room,
        status: 'success'
      });

      // Update last used
      const virtualCardRef = ref(database, `virtualCards/${virtualIdToUse}/lastUsed`);
      await set(virtualCardRef, Date.now());

      Alert.alert(
        '✅ Check-in Successful!',
        `Subject: ${subject}\nRoom: ${room}\nVirtual ID: ${virtualIdToUse}`,
        [{ 
          text: 'OK',
          onPress: () => {
            setLoading(false);
            loadUserVirtualIds();
          }
        }]
      );

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to record check-in');
      setLoading(false);
    }
  };

  const renderVirtualIdPicker = () => (
    <Modal
      visible={showVirtualIdPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVirtualIdPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Virtual ID</Text>
            <Pressable onPress={() => setShowVirtualIdPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          
          <Text style={styles.modalSubtitle}>Choose which virtual ID to use for check-in</Text>
          
          <ScrollView style={styles.pickerList}>
            {userVirtualIds.map((virtualId, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.pickerItem,
                  pressed && styles.pickerItemPressed,
                  selectedVirtualId === virtualId.cardId && styles.pickerItemSelected
                ]}
                onPress={() => {
                  setSelectedVirtualId(virtualId.cardId);
                  setShowVirtualIdPicker(false);
                }}
              >
                <View style={styles.pickerItemIcon}>
                  <Text style={styles.pickerItemIconText}>📱</Text>
                </View>
                <View style={styles.pickerItemInfo}>
                  <Text style={styles.pickerItemId}>{virtualId.cardId}</Text>
                  <Text style={styles.pickerItemName}>{virtualId.name || 'Virtual ID'}</Text>
                  {virtualId.linkedAt && (
                    <Text style={styles.pickerItemDate}>
                      Created: {new Date(virtualId.linkedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {selectedVirtualId === virtualId.cardId && (
                  <View style={styles.selectedCheck}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
          
          <Pressable
            style={({ pressed }) => [
              styles.modalCloseButton,
              pressed && styles.modalCloseButtonPressed
            ]}
            onPress={() => setShowVirtualIdPicker(false)}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const getSelectedVirtualCard = () => {
    return userVirtualIds.find(v => v.cardId === selectedVirtualId) || userVirtualIds[0];
  };

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#06b6d4']}
            tintColor="#06b6d4"
          />
        }
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Check-in</Text>
            <Text style={styles.subtitle}>
              Record your attendance using virtual IDs
            </Text>
          </View>

          {/* Virtual IDs Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Virtual IDs</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{userVirtualIds.length} available</Text>
              </View>
            </View>
            
            {userVirtualIds.length > 0 ? (
              <>
                {/* Selected Virtual ID */}
                <View style={styles.selectedCard}>
                  <View style={styles.selectedCardHeader}>
                    <View style={styles.selectedCardIcon}>
                      <Text style={styles.selectedCardIconText}>📱</Text>
                    </View>
                    <View style={styles.selectedCardInfo}>
                      <Text style={styles.selectedCardId}>
                        {selectedVirtualId}
                      </Text>
                      <Text style={styles.selectedCardName}>
                        {getSelectedVirtualCard()?.name || 'Virtual ID'}
                      </Text>
                    </View>
                    <Pressable 
                      style={styles.changeButton}
                      onPress={() => setShowVirtualIdPicker(true)}
                    >
                      <Text style={styles.changeButtonText}>Change</Text>
                    </Pressable>
                  </View>
                  
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionButton,
                      pressed && styles.primaryActionButtonPressed,
                      loading && styles.buttonDisabled
                    ]}
                    onPress={quickVirtualCheckIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.primaryActionButtonText}>
                          Quick Check-in with this ID
                        </Text>
                        <Text style={styles.primaryActionButtonSubtext}>
                          Subject: {subject} • Room: {room}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {/* Other Virtual IDs */}
                <Text style={styles.sectionSubtitle}>Or tap any ID below:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {userVirtualIds.map((virtualId, index) => (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.virtualIdCard,
                        pressed && styles.virtualIdCardPressed,
                        selectedVirtualId === virtualId.cardId && styles.virtualIdCardSelected
                      ]}
                      onPress={() => {
                        setSelectedVirtualId(virtualId.cardId);
                        quickVirtualCheckIn();
                      }}
                    >
                      <View style={styles.virtualIdCardIcon}>
                        <Text style={styles.virtualIdCardIconText}>
                          {selectedVirtualId === virtualId.cardId ? '✓' : '📱'}
                        </Text>
                      </View>
                      <Text style={styles.virtualIdCardId} numberOfLines={1}>
                        {virtualId.cardId.substring(0, 8)}...
                      </Text>
                      <Text style={styles.virtualIdCardTap}>Tap to check-in</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📱</Text>
                <Text style={styles.emptyTitle}>No Virtual IDs</Text>
                <Text style={styles.emptyDescription}>
                  Create a virtual ID to check-in with your phone
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyActionButton,
                    pressed && styles.emptyActionButtonPressed
                  ]}
                  onPress={() => navigation.navigate('RegisterCard')}
                >
                  <Text style={styles.emptyActionButtonText}>Create Virtual ID</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Check-in Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check-in Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={subject}
                  onValueChange={setSubject}
                  style={styles.picker}
                  dropdownIconColor="#06b6d4"
                >
                  {SUBJECTS.map((sub, index) => (
                    <Picker.Item key={index} label={sub} value={sub} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room/Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={room}
                  onValueChange={setRoom}
                  style={styles.picker}
                  dropdownIconColor="#06b6d4"
                >
                  {ROOMS.map((rm, index) => (
                    <Picker.Item key={index} label={rm} value={rm} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.quickActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionButton,
                  styles.quickActionButtonPrimary,
                  pressed && styles.quickActionButtonPressed,
                  (loading || userVirtualIds.length === 0) && styles.buttonDisabled
                ]}
                onPress={quickVirtualCheckIn}
                disabled={loading || userVirtualIds.length === 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.quickActionPrimaryIcon}>✓</Text>
                    <Text style={styles.quickActionPrimaryText}>Quick Check-in</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.quickActionButton,
                  pressed && styles.quickActionButtonPressed
                ]}
                onPress={openVirtualCard}
              >
                <Text style={styles.quickActionIcon}>📱</Text>
                <Text style={styles.quickActionText}>Virtual Card Mode</Text>
              </Pressable>
            </View>
          </View>

          {/* Other Options */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Other Check-in Methods</Text>
            
            <View style={styles.optionsGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.optionCardPressed
                ]}
                onPress={() => navigation.navigate('Home')}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#06b6d4' }]}>
                  <Text style={styles.optionIconText}>QR</Text>
                </View>
                <Text style={styles.optionTitle}>QR Code</Text>
                <Text style={styles.optionDescription}>
                  Show QR to scanner
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.optionCardPressed
                ]}
                onPress={() => navigation.navigate('RegisterCard')}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#8b5cf6' }]}>
                  <Text style={styles.optionIconText}>💳</Text>
                </View>
                <Text style={styles.optionTitle}>Physical Card</Text>
                <Text style={styles.optionDescription}>
                  Register NFC card
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Status Summary */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Text style={styles.statusIconText}>📊</Text>
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Check-in Status</Text>
                <Text style={styles.statusText}>
                  {userVirtualIds.length > 0 
                    ? `Ready with ${userVirtualIds.length} virtual ID${userVirtualIds.length !== 1 ? 's' : ''}`
                    : 'Create a virtual ID to start'
                  }
                </Text>
              </View>
            </View>
            {userVirtualIds.length > 0 && (
              <Text style={styles.statusHint}>
                Selected: {selectedVirtualId}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Virtual ID Picker Modal */}
      {renderVirtualIdPicker()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  
  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardBadge: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Selected Card
  selectedCard: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#06b6d4',
    marginBottom: 20,
  },
  selectedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCardIconText: {
    fontSize: 24,
    color: '#fff',
  },
  selectedCardInfo: {
    flex: 1,
  },
  selectedCardId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  selectedCardName: {
    fontSize: 14,
    color: '#475569',
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  primaryActionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionButtonPressed: {
    backgroundColor: '#0da271',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryActionButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  
  // Section
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  virtualIdCard: {
    width: 120,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginRight: 12,
    alignItems: 'center',
  },
  virtualIdCardPressed: {
    backgroundColor: '#f8fafc',
  },
  virtualIdCardSelected: {
    borderColor: '#06b6d4',
    backgroundColor: '#f0f9ff',
  },
  virtualIdCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  virtualIdCardIconText: {
    fontSize: 20,
    color: '#64748b',
  },
  virtualIdCardId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  virtualIdCardTap: {
    fontSize: 10,
    color: '#06b6d4',
    fontWeight: '500',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyActionButton: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionButtonPressed: {
    backgroundColor: '#0891b2',
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Form
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 56,
    color: '#0f172a',
  },
  
  // Quick Actions - FIXED STYLES
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  quickActionButtonPrimary: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  quickActionButtonPressed: {
    opacity: 0.8,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#64748b',
  },
  quickActionPrimaryIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#fff',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  quickActionPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  
  // Options Grid
  optionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  optionCardPressed: {
    backgroundColor: '#f1f5f9',
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconText: {
    fontSize: 24,
    color: '#fff',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusIconText: {
    fontSize: 24,
    color: '#fff',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
  },
  statusHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
    paddingTop: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  pickerList: {
    paddingHorizontal: 24,
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  pickerItemPressed: {
    backgroundColor: '#f8fafc',
  },
  pickerItemSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#06b6d4',
  },
  pickerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickerItemIconText: {
    fontSize: 20,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  pickerItemName: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  pickerItemDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedCheckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#0f172a',
    margin: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonPressed: {
    backgroundColor: '#1e293b',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});