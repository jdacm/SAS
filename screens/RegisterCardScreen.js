// screens/RegisterCardScreen.js - UPDATED WITH LARGER BUTTONS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Vibration,
  Modal,
  Animated
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { database } from '../firebaseConfig';
import { ref, set, get, remove } from 'firebase/database';

export default function RegisterCardScreen({ user, navigation }) {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [registeredCards, setRegisteredCards] = useState([]);
  const [nfcSupported, setNfcSupported] = useState(true);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const { width } = useWindowDimensions();
  
  // Animation values
  const scanAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadUserCards();
    startPulseAnimation();
  }, [user]);

  // Load user's cards
  const loadUserCards = async () => {
    try {
      const cardsRef = ref(database, 'userCards');
      const snapshot = await get(cardsRef);
      if (snapshot.exists()) {
        const cards = [];
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.userId === user.uid) {
            cards.push({
              id: childSnapshot.key,
              ...data
            });
          }
        });
        setRegisteredCards(cards);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  // NFC scanning function
  const scanNFC = () => {
    setScanning(true);
    setShowScanner(true);
    setLastScanned(null);
    
    // Start scanning animation
    Animated.timing(scanAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
    
    // Simulate scanning process
    setTimeout(() => {
      Vibration.vibrate([100, 50, 100]);
      
      // Generate realistic NFC UID
      const hex = '0123456789ABCDEF';
      let nfcUid = '';
      for (let i = 0; i < 8; i++) {
        nfcUid += hex[Math.floor(Math.random() * hex.length)];
      }
      
      // Format like real NFC UID
      nfcUid = nfcUid.match(/.{1,2}/g).join(':');
      
      setLastScanned(nfcUid);
      setScanning(false);
      
      // Show card detected
      setTimeout(() => {
        setShowScanner(false);
        showRegistrationOptions(nfcUid);
        scanAnim.setValue(0);
      }, 800);
    }, 2500);
  };

  // NFC Scanner Modal
  const renderNFCScanner = () => (
    <Modal
      transparent
      visible={showScanner}
      animationType="fade"
      onRequestClose={() => {
        setShowScanner(false);
        setScanning(false);
      }}
    >
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>NFC Scanner</Text>
            <Pressable onPress={() => setShowScanner(false)}>
              <Text style={styles.scannerClose}>✕</Text>
            </Pressable>
          </View>
          
          <View style={styles.scannerContent}>
            <View style={styles.phoneOutline}>
              <View style={styles.phoneScreen}>
                <Animated.View 
                  style={[
                    styles.scanBeam,
                    {
                      transform: [
                        { scale: pulseAnim },
                        { translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -100]
                        })}
                      ],
                      opacity: scanAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.7, 1, 0]
                      })
                    }
                  ]}
                />
                <View style={styles.nfcIndicator}>
                  <Text style={styles.nfcIndicatorText}>NFC</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.scannerStatus}>
              {scanning ? "Scanning for NFC card..." : "✓ Card detected!"}
            </Text>
            
            {scanning ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color="#06b6d4" />
                <Text style={styles.scanningText}>Hold card near phone</Text>
              </View>
            ) : (
              <View style={styles.successIndicator}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>Card read successfully</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Start pulse animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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

  // Show registration options
  const showRegistrationOptions = (nfcUid) => {
    Alert.alert(
      'Card Detected',
      `Card ID: ${nfcUid}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Register Card', 
          onPress: () => registerPhysicalCard(nfcUid, false)
        },
        { 
          text: 'Register + Virtual Copy', 
          onPress: () => registerPhysicalCard(nfcUid, true)
        }
      ]
    );
  };

  // Register physical card
  const registerPhysicalCard = async (nfcUid, createVirtual = false) => {
    try {
      // Check if card already registered
      const checkRef = ref(database, `physicalCards/${nfcUid}`);
      const snapshot = await get(checkRef);
      
      if (snapshot.exists()) {
        Alert.alert('Error', 'This card is already registered');
        return;
      }

      const safeKey = `card_${user.uid.substring(0, 6)}_${Date.now()}`;
      
      // Register physical card
      await set(ref(database, `physicalCards/${nfcUid}`), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        linkedAt: Date.now(),
        isActive: true,
        type: 'physical'
      });

      // Add to user's card list
      await set(ref(database, `userCards/${safeKey}_physical`), {
        userId: user.uid,
        cardId: nfcUid,
        cardType: 'physical',
        linkedAt: Date.now(),
        name: 'NFC ID Card'
      });

      let virtualId = null;
      
      if (createVirtual) {
        // Generate virtual ID
        virtualId = `V-${user.uid.substring(0, 4)}-${Date.now().toString(36).toUpperCase().substring(4, 8)}`;
        
        // Register virtual card
        await set(ref(database, `virtualCards/${virtualId}`), {
          userId: user.uid,
          userName: user.displayName,
          userEmail: user.email,
          physicalCardId: nfcUid,
          linkedAt: Date.now(),
          isActive: true,
          type: 'virtual'
        });

        // Add virtual card to user's list
        await set(ref(database, `userCards/${safeKey}_virtual`), {
          userId: user.uid,
          cardId: virtualId,
          cardType: 'virtual',
          physicalCardId: nfcUid,
          linkedAt: Date.now(),
          name: 'Phone NFC Emulation'
        });
      }

      Alert.alert(
        'Registration Successful',
        `Card registered successfully!${virtualId ? `\n\nVirtual ID: ${virtualId}` : ''}`,
        [{ 
          text: 'OK', 
          onPress: () => {
            loadUserCards();
            Vibration.vibrate([100, 50, 100, 50, 100]);
          }
        }]
      );

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', 'Failed to register card');
    }
  };

  // Create virtual ID
  const createVirtualID = async () => {
    const virtualId = `V-${user.uid.substring(0, 4)}-${Date.now().toString(36).toUpperCase().substring(4, 8)}`;
    const safeKey = `virtual_${user.uid.substring(0, 6)}_${Date.now()}`;
    
    try {
      await set(ref(database, `virtualCards/${virtualId}`), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        linkedAt: Date.now(),
        isActive: true,
        type: 'virtual'
      });

      await set(ref(database, `userCards/${safeKey}_virtual`), {
        userId: user.uid,
        cardId: virtualId,
        cardType: 'virtual',
        linkedAt: Date.now(),
        name: 'Phone NFC ID'
      });

      Alert.alert(
        'Virtual ID Created',
        `Your virtual ID: ${virtualId}\n\nUse this for phone NFC check-in.`,
        [{ text: 'OK', onPress: loadUserCards }]
      );
    } catch (error) {
      console.error('Virtual ID error:', error);
      Alert.alert('Error', 'Failed to create virtual ID');
    }
  };

  // Quick registration (for demo purposes)
  const quickRegister = () => {
    const demoUid = '04:A3:B8:C7:D2:E9:F1:88';
    setLastScanned(demoUid);
    registerPhysicalCard(demoUid, true);
  };

  // Remove card
  const removeCard = async (cardId, cardType) => {
    Alert.alert(
      'Remove Card',
      `Remove this ${cardType} card from your account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from main collection
              if (cardType === 'physical') {
                await remove(ref(database, `physicalCards/${cardId}`));
              } else {
                await remove(ref(database, `virtualCards/${cardId}`));
              }
              
              // Remove from userCards
              const userCardsRef = ref(database, 'userCards');
              const snapshot = await get(userCardsRef);
              
              if (snapshot.exists()) {
                snapshot.forEach((child) => {
                  const data = child.val();
                  if (data.userId === user.uid && data.cardId === cardId) {
                    remove(ref(database, `userCards/${child.key}`));
                  }
                });
              }
              
              Alert.alert('Success', 'Card removed');
              loadUserCards();
            } catch (error) {
              console.error('Remove error:', error);
              Alert.alert('Error', 'Failed to remove card');
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <View style={styles.nfcStatus}>
              <View style={[styles.statusDot, nfcEnabled && styles.statusActive]} />
              <Text style={styles.nfcStatusText}>
                {nfcEnabled ? 'NFC Ready' : 'NFC Off'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>Register Cards</Text>
          <Text style={styles.subtitle}>
            Register physical NFC cards or create virtual IDs
          </Text>

          {/* LARGER Action Buttons - Still 3 in a row */}
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                scanning && styles.buttonDisabled,
                pressed && styles.buttonPressed
              ]}
              onPress={scanNFC}
              disabled={scanning}
            >
              <View style={[styles.buttonIcon, { backgroundColor: '#06b6d4' }]}>
                <Text style={styles.buttonIconText}>📱</Text>
              </View>
              <Text style={styles.buttonTitle}>
                {scanning ? 'Scanning...' : 'Scan Card'}
              </Text>
              <Text style={styles.buttonDescription}>
                Tap physical card
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed
              ]}
              onPress={createVirtualID}
            >
              <View style={[styles.buttonIcon, { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.buttonIconText}>🆔</Text>
              </View>
              <Text style={styles.buttonTitle}>Virtual ID</Text>
              <Text style={styles.buttonDescription}>
                Phone NFC ID
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed
              ]}
              onPress={quickRegister}
            >
              <View style={[styles.buttonIcon, { backgroundColor: '#10b981' }]}>
                <Text style={styles.buttonIconText}>⚡</Text>
              </View>
              <Text style={styles.buttonTitle}>Quick Add</Text>
              <Text style={styles.buttonDescription}>
                Demo card
              </Text>
            </Pressable>
          </View>

          {/* Last Scanned Card */}
          {lastScanned && (
            <View style={styles.scannedCard}>
              <Text style={styles.scannedLabel}>Last Scanned Card:</Text>
              <Text style={styles.scannedUid}>{lastScanned}</Text>
            </View>
          )}

          {/* Registered Cards Section */}
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>Your Cards ({registeredCards.length})</Text>
            
            {registeredCards.length > 0 ? (
              registeredCards.map((card, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardId}>{card.cardId}</Text>
                      <View style={[
                        styles.cardTypeBadge,
                        card.cardType === 'virtual' ? styles.virtualBadge : styles.physicalBadge
                      ]}>
                        <Text style={styles.cardTypeText}>
                          {card.cardType.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardDate}>
                      Added: {new Date(card.linkedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && styles.removeButtonPressed
                    ]}
                    onPress={() => removeCard(card.cardId, card.cardType)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyCards}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>No Cards Registered</Text>
                <Text style={styles.emptyDescription}>
                  Use the buttons above to add cards
                </Text>
              </View>
            )}
          </View>

          {/* Quick Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to Register Cards</Text>
            <View style={styles.instructionRow}>
              <View style={styles.instructionBullet}>
                <Text style={styles.instructionBulletText}>1</Text>
              </View>
              <Text style={styles.instructionText}>Tap "Scan Card" to register physical NFC cards</Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionBullet}>
                <Text style={styles.instructionBulletText}>2</Text>
              </View>
              <Text style={styles.instructionText}>"Virtual ID" creates phone-based NFC emulation</Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionBullet}>
                <Text style={styles.instructionBulletText}>3</Text>
              </View>
              <Text style={styles.instructionText}>"Quick Add" instantly registers a demo card</Text>
            </View>
            <View style={styles.instructionRow}>
              <View style={styles.instructionBullet}>
                <Text style={styles.instructionBulletText}>4</Text>
              </View>
              <Text style={styles.instructionText}>Both card types work for attendance check-in</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* NFC Scanner Modal */}
      {renderNFCScanner()}
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
    padding: 16,
    paddingBottom: 30,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  backButton: { 
    padding: 8,
    paddingLeft: 0,
  },
  backButtonText: { 
    fontSize: 16, 
    color: '#06b6d4', 
    fontWeight: '500' 
  },
  nfcStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 6,
  },
  statusActive: { 
    backgroundColor: '#10b981' 
  },
  nfcStatusText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  // LARGER Action Buttons (3 in a row)
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 130, // Increased from 100
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: '#f8fafc',
  },
  buttonIcon: {
    width: 56, // Increased from 44
    height: 56, // Increased from 44
    borderRadius: 28, // Increased from 22
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Increased from 8
  },
  buttonIconText: { 
    fontSize: 28 // Increased from 22
  },
  buttonTitle: {
    fontSize: 15, // Increased from 13
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  buttonDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Scanned Card
  scannedCard: {
    backgroundColor: '#f0f9ff',
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#06b6d4',
    marginBottom: 24,
  },
  scannedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  scannedUid: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    fontFamily: 'monospace',
  },
  
  // Cards Section
  cardsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  cardId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  cardTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  virtualBadge: { 
    backgroundColor: '#ede9fe' 
  },
  physicalBadge: { 
    backgroundColor: '#d1fae5' 
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cardName: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  removeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  removeButtonPressed: {
    backgroundColor: '#fecaca',
  },
  removeButtonText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  
  // Empty State
  emptyCards: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyIcon: { 
    fontSize: 48, 
    marginBottom: 16 
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Instructions
  instructions: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionBulletText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  
  // NFC Scanner Styles (unchanged)
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scannerClose: {
    fontSize: 20,
    color: '#64748b',
    padding: 4,
  },
  scannerContent: {
    padding: 24,
    alignItems: 'center',
  },
  phoneOutline: {
    width: 220,
    height: 140,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  phoneScreen: {
    width: 200,
    height: 100,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanBeam: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  nfcIndicator: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIndicatorText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  scannerStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanningIndicator: {
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  successIndicator: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#10b981',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center',
  },
});