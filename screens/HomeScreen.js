import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { database } from '../firebaseConfig';
import { ref, query, limitToLast, orderByKey, onValue } from 'firebase/database';
import QRCode from 'react-native-qrcode-svg';

export default function HomeScreen({ user, navigation }) {
  const [lastAttendance, setLastAttendance] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [todayCheckins, setTodayCheckins] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    try {
      // Get last attendance record
      const attendanceRef = ref(database, '/attendance');
      
      const unsubscribe = onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const records = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .filter(record => record.userId === user.uid)
            .sort((a, b) => b.timestamp - a.timestamp);
          
          setTotalCheckins(records.length);
          
          // Get today's checkins
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const todayRecords = records.filter(record => record.timestamp >= todayStart);
          setTodayCheckins(todayRecords.length);
          
          // Set last attendance
          if (records.length > 0) {
            setLastAttendance(records[0]);
          }
        } else {
          setTotalCheckins(0);
          setTodayCheckins(0);
          setLastAttendance(null);
        }
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error in HomeScreen:', error);
    }
  }, [user]);

  const renderLastAttendance = () => {
    if (!lastAttendance) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Check-in</Text>
          <Text style={styles.emptyState}>No check-ins yet</Text>
          <Text style={styles.emptySubtitle}>Tap your NFC card or use QR code to check in</Text>
        </View>
      );
    }

    const dateObj = new Date(lastAttendance.timestamp);
    const phDate = dateObj.toLocaleDateString('en-PH', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
    const phTime = dateObj.toLocaleTimeString('en-PH', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    });

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Check-in</Text>
        <View style={styles.lastCheckinRow}>
          <View style={styles.checkinIcon}>
            <Text style={styles.checkinIconText}>✓</Text>
          </View>
          <View style={styles.checkinDetails}>
            <Text style={styles.checkinMethod}>NFC Card Check-in</Text>
            <Text style={styles.checkinTime}>{phTime}</Text>
            <Text style={styles.checkinDate}>{phDate}</Text>
          </View>
        </View>
        {lastAttendance.nfcUid && (
          <View style={styles.cardIdContainer}>
            <Text style={styles.cardIdLabel}>Card ID:</Text>
            <Text style={styles.cardId}>{lastAttendance.nfcUid}</Text>
          </View>
        )}
      </View>
    );
  };

  const openCardRegistration = () => {
    navigation.navigate('RegisterCard');
  };

  const qrData = JSON.stringify({
    userId: user?.uid,
    userName: user?.displayName,
    timestamp: Date.now()
  });

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.containerInner}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] || 'User'} 👋</Text>
              <Text style={styles.subtitle}>Welcome back to Attendance App</Text>
            </View>
            <Pressable style={styles.qrIconButton} onPress={() => setShowQR(true)}>
              <Text style={styles.qrIcon}>QR</Text>
            </Pressable>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalCheckins}</Text>
              <Text style={styles.statLabel}>Total Check-ins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{todayCheckins}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionButton} onPress={() => setShowQR(true)}>
              <View style={[styles.actionIcon, { backgroundColor: '#06b6d4' }]}>
                <Text style={styles.actionIconText}>QR</Text>
              </View>
              <Text style={styles.actionText}>Show QR</Text>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={openCardRegistration}>
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.actionIconText}>NFC</Text>
              </View>
              <Text style={styles.actionText}>Register Card</Text>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={() => navigation.navigate('Check-In')}>
              <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                <Text style={styles.actionIconText}>✓</Text>
              </View>
              <Text style={styles.actionText}>Check In</Text>
            </Pressable>
          </View>
          
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {renderLastAttendance()}
          
          <Pressable style={styles.viewAllButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.viewAllText}>View All History →</Text>
          </Pressable>
        </View>
      </ScrollView>
      
      <Modal visible={showQR} animationType="slide" transparent onRequestClose={() => setShowQR(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your QR Code</Text>
            <Text style={styles.modalSubtitle}>Show this for manual check-in</Text>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={220}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            
            <Text style={styles.userInfo}>
              {user?.displayName} • {user?.email}
            </Text>
            
            <Pressable style={styles.closeButton} onPress={() => setShowQR(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
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
  containerInner: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  qrIconButton: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  qrIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06b6d4',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06b6d4',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef6fb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  emptyState: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 4,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  lastCheckinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkinIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkinIconText: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: 'bold',
  },
  checkinDetails: {
    flex: 1,
  },
  checkinMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  checkinTime: {
    fontSize: 14,
    color: '#06b6d4',
    fontWeight: '500',
    marginBottom: 2,
  },
  checkinDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardIdContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIdLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
  },
  cardId: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#06b6d4',
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
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});