import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Alert, 
  Image,
  Modal,
  ActivityIndicator
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { database } from '../firebaseConfig';
import { ref, set, get } from 'firebase/database';
import * as Crypto from 'expo-crypto';

export default function RegisterCardScreen({ user, navigation }) {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [registeredCards, setRegisteredCards] = useState([]);
  const [showPhoneNFCModal, setShowPhoneNFCModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [virtualNfcId, setVirtualNfcId] = useState('');

  React.useEffect(() => {
    loadUserCards();
  }, []);

  const loadUserCards = async () => {
    try {
      const cardsRef = ref(database, 'cardMappings');
      const snapshot = await get(cardsRef);
      if (snapshot.exists()) {
        const cards = [];
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.userId === user.uid) {
            cards.push({
              nfcUid: childSnapshot.key,
              ...data,
              isVirtual: data.isVirtual || false
            });
          }
        });
        setRegisteredCards(cards);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const generateVirtualNFC = async () => {
    setGenerating(true);
    try {
      const uniqueId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${user.uid}-${Date.now()}-${Math.random()}`
      );
      
      const virtualId = uniqueId.substring(0, 8).toUpperCase();
      setVirtualNfcId(virtualId);
      
      await linkVirtualCard(virtualId, true);
      
    } catch (error) {
      console.error('Error generating virtual NFC:', error);
      Alert.alert('Error', 'Failed to generate virtual NFC ID');
    } finally {
      setGenerating(false);
    }
  };

  const linkVirtualCard = async (nfcUid, isVirtual = false) => {
    try {
      const cardRef = ref(database, `cardMappings/${nfcUid}`);
      const snapshot = await get(cardRef);
      
      if (snapshot.exists()) {
        Alert.alert('Error', 'This ID is already registered. Generating a new one...');
        await generateVirtualNFC();
        return;
      }
      
      await set(cardRef, {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        linkedAt: Date.now(),
        lastUsed: null,
        isVirtual: isVirtual,
        deviceInfo: isVirtual ? 'Mobile Device' : 'Physical NFC Card'
      });
      
      Alert.alert(
        'Success',
        `Virtual NFC ID created!\n\nID: ${nfcUid}\n\nUse this ID for mobile check-in.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              loadUserCards();
              setShowPhoneNFCModal(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error linking virtual card:', error);
      Alert.alert('Error', 'Failed to create virtual NFC ID');
    }
  };

  const simulateNFCScan = () => {
    setScanning(true);
    
    setTimeout(() => {
      const mockNfcUid = generateMockNfcUid();
      setLastScanned(mockNfcUid);
      setScanning(false);
      
      Alert.alert(
        'Card Detected',
        `NFC UID: ${mockNfcUid}\n\nLink this card to your account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Link Card', 
            onPress: () => linkPhysicalCard(mockNfcUid) 
          }
        ]
      );
    }, 1500);
  };

  const generateMockNfcUid = () => {
    const hexChars = '0123456789ABCDEF';
    let uid = '';
    for (let i = 0; i < 8; i++) {
      uid += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
    }
    return uid;
  };

  const linkPhysicalCard = async (nfcUid) => {
    try {
      const cardRef = ref(database, `cardMappings/${nfcUid}`);
      const snapshot = await get(cardRef);
      
      if (snapshot.exists()) {
        Alert.alert('Error', 'This card is already registered to another user.');
        return;
      }
      
      await set(cardRef, {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        linkedAt: Date.now(),
        lastUsed: null,
        isVirtual: false,
        deviceInfo: 'Physical NFC Card'
      });
      
      Alert.alert(
        'Success',
        'Physical card linked successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              loadUserCards();
              setLastScanned(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error linking card:', error);
      Alert.alert('Error', 'Failed to link card. Please try again.');
    }
  };

  const unlinkCard = async (nfcUid) => {
    Alert.alert(
      'Unlink Card',
      'Are you sure you want to unlink this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await set(ref(database, `cardMappings/${nfcUid}`), null);
              loadUserCards();
              Alert.alert('Success', 'Card unlinked successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to unlink card.');
            }
          }
        }
      ]
    );
  };

  const copyVirtualIdToClipboard = async () => {
    if (virtualNfcId) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(virtualNfcId);
        Alert.alert('Copied!', 'Virtual NFC ID copied to clipboard.');
      } else {
        Alert.alert('Virtual NFC ID', virtualNfcId);
      }
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.inner}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        
        <Text style={styles.title}>NFC Registration</Text>
        <Text style={styles.subtitle}>
          Link physical cards or create virtual IDs
        </Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2965/2965306.png' }}
              style={styles.nfcIcon}
            />
            <Text style={styles.cardTitle}>Options</Text>
          </View>
          
          <View style={styles.optionsContainer}>
            <Pressable 
              style={styles.optionButton}
              onPress={() => setShowPhoneNFCModal(true)}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📱</Text>
              </View>
              <Text style={styles.optionTitle}>Use Phone as NFC</Text>
              <Text style={styles.optionDescription}>
                Generate virtual NFC ID for mobile check-in
              </Text>
            </Pressable>
            
            <Pressable 
              style={styles.optionButton}
              onPress={simulateNFCScan}
              disabled={scanning}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>💳</Text>
              </View>
              <Text style={styles.optionTitle}>Register Physical Card</Text>
              <Text style={styles.optionDescription}>
                Link a physical NFC card
              </Text>
              {scanning && <ActivityIndicator size="small" color="#06b6d4" />}
            </Pressable>
          </View>
          
          {lastScanned && (
            <View style={styles.result}>
              <Text style={styles.resultLabel}>Scanned Card:</Text>
              <Text style={styles.resultValue}>{lastScanned}</Text>
              <Pressable 
                style={styles.linkButton}
                onPress={() => linkPhysicalCard(lastScanned)}
              >
                <Text style={styles.linkButtonText}>Link This Card</Text>
              </Pressable>
            </View>
          )}
        </View>
        
        {registeredCards.length > 0 && (
          <View style={styles.registeredSection}>
            <Text style={styles.sectionTitle}>Your Registered IDs</Text>
            {registeredCards.map((card, index) => (
              <View key={index} style={styles.registeredCard}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardUid}>{card.nfcUid}</Text>
                    {card.isVirtual ? (
                      <Text style={styles.virtualBadge}>VIRTUAL</Text>
                    ) : (
                      <Text style={styles.physicalBadge}>PHYSICAL</Text>
                    )}
                  </View>
                  <Text style={styles.cardDevice}>{card.deviceInfo}</Text>
                  <Text style={styles.cardDate}>
                    Linked on {new Date(card.linkedAt).toLocaleDateString()}
                  </Text>
                  {card.lastUsed && (
                    <Text style={styles.cardLastUsed}>
                      Last used: {new Date(card.lastUsed).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Pressable 
                  style={styles.unlinkButton}
                  onPress={() => unlinkCard(card.nfcUid)}
                >
                  <Text style={styles.unlinkButtonText}>Unlink</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={showPhoneNFCModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhoneNFCModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phone as NFC</Text>
            <Text style={styles.modalSubtitle}>
              Generate a virtual NFC ID for mobile check-in
            </Text>
            
            <View style={styles.virtualCard}>
              <Text style={styles.virtualCardLabel}>Virtual NFC ID:</Text>
              {virtualNfcId ? (
                <>
                  <Text style={styles.virtualCardId}>{virtualNfcId}</Text>
                  <Text style={styles.virtualCardHint}>
                    Use this ID for mobile check-in
                  </Text>
                </>
              ) : (
                <Text style={styles.virtualCardPlaceholder}>
                  {generating ? 'Generating...' : 'No ID generated yet'}
                </Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.generateButton]}
                onPress={generateVirtualNFC}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {virtualNfcId ? 'Regenerate ID' : 'Generate Virtual ID'}
                  </Text>
                )}
              </Pressable>
              
              {virtualNfcId && (
                <Pressable 
                  style={[styles.modalButton, styles.copyButton]}
                  onPress={copyVirtualIdToClipboard}
                >
                  <Text style={styles.modalButtonText}>Copy ID</Text>
                </Pressable>
              )}
              
              <Pressable 
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowPhoneNFCModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>How to use:</Text>
              <Text style={styles.instruction}>1. Generate a virtual NFC ID</Text>
              <Text style={styles.instruction}>2. Use this ID for mobile check-in</Text>
              <Text style={styles.instruction}>3. You can also use physical NFC cards</Text>
              <Text style={styles.instruction}>4. Each user can have multiple IDs</Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inner: { 
    flex: 1,
    paddingTop: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '500',
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
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef6fb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  nfcIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    alignItems: 'center',
    marginHorizontal: 8,
    minHeight: 120,
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionIconText: {
    fontSize: 32,
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
  result: {
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    color: '#0369a1',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c4a6e',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  linkButton: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  registeredSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  registeredCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardUid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'monospace',
    marginRight: 8,
  },
  virtualBadge: {
    fontSize: 10,
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  physicalBadge: {
    fontSize: 10,
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  cardDevice: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  cardLastUsed: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  unlinkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  unlinkButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
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
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  virtualCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  virtualCardLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  virtualCardId: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06b6d4',
    fontFamily: 'monospace',
    marginBottom: 4,
    letterSpacing: 1,
  },
  virtualCardHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  virtualCardPlaceholder: {
    fontSize: 16,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  modalButtons: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#06b6d4',
  },
  copyButton: {
    backgroundColor: '#8b5cf6',
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
  instructions: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 12,
    color: '#0369a1',
    marginBottom: 4,
    lineHeight: 16,
  },
});