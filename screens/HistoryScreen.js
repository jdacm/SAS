// screens/HistoryScreen.js - SIMPLE DIRECT DISPLAY
import React, { useEffect, useState } from 'react';
import { 
  FlatList, 
  Text, 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import ScreenContainer from '../components/ScreenContainer';

export default function HistoryScreen({ user }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendance = () => {
    if (!user) return;
    
    try {
      const attendanceRef = ref(database, '/attendance');
      const unsubscribe = onValue(attendanceRef, snapshot => {
        const data = snapshot.val();
        if (data) {
          const userAttendance = Object.keys(data)
            .map(key => ({
              id: key,
              ...data[key]
            }))
            .filter(item => item.userId === user.uid)
            .map(item => {
              // Use the dateTime string directly if it exists
              if (item.dateTime) {
                // Parse the dateTime string from ESP32 (format: "YYYY-MM-DD HH:MM:SS")
                const [datePart, timePart] = item.dateTime.split(' ');
                return {
                  ...item,
                  displayDate: datePart,
                  displayTime: timePart,
                  // Also keep timestamp for sorting
                  sortTimestamp: item.timestamp || Date.now()
                };
              }
              // Fallback to timestamp conversion
              const date = new Date(item.timestamp || Date.now());
              return {
                ...item,
                displayDate: date.toLocaleDateString('en-PH'),
                displayTime: date.toLocaleTimeString('en-PH', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false  // Use 24-hour format to match ESP32
                }),
                sortTimestamp: item.timestamp || Date.now()
              };
            })
            .sort((a, b) => b.sortTimestamp - a.sortTimestamp);
          
          setAttendance(userAttendance);
        } else {
          setAttendance([]);
        }
        setLoading(false);
        setRefreshing(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching history:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  const renderItem = ({ item }) => (
    <View style={styles.timelineItem}>
      <View style={[
        styles.timelineDot,
        item.cardType === 'virtual' ? styles.dotVirtual : styles.dotPhysical
      ]} />
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTime}>{item.displayTime || '--:--'}</Text>
          <Text style={styles.timelineDate}>{item.displayDate || '--/--/----'}</Text>
        </View>
        
        <View style={styles.methodRow}>
          <View style={[
            styles.methodBadge,
            item.cardType === 'virtual' ? styles.badgeVirtual : styles.badgePhysical
          ]}>
            <Text style={styles.methodBadgeText}>
              {item.cardType === 'virtual' ? 'PHONE NFC' : 'CARD NFC'}
            </Text>
          </View>
          {item.device && (
            <Text style={styles.deviceText}>{item.device}</Text>
          )}
        </View>
        
        {item.uid && (
          <View style={styles.cardIdRow}>
            <Text style={styles.cardIdLabel}>Card ID: </Text>
            <Text style={styles.cardId}>{item.uid}</Text>
          </View>
        )}
        
        {item.location && (
          <Text style={styles.locationText}>📍 {item.location}</Text>
        )}
        
        {/* Debug info - show what ESP32 recorded */}
        {item.dateTime && (
          <Text style={styles.rawInfo}>ESP32 recorded: {item.dateTime}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.inner}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>
          {attendance.length} check-in{attendance.length !== 1 ? 's' : ''} recorded
        </Text>
        
        {attendance.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap your NFC card on the ESP32 reader to record attendance
            </Text>
          </View>
        ) : (
          <FlatList
            data={attendance}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#06b6d4']}
                tintColor="#06b6d4"
              />
            }
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inner: { 
    flex: 1,
    padding: 16,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  dotPhysical: {
    backgroundColor: '#06b6d4',
  },
  dotVirtual: {
    backgroundColor: '#8b5cf6',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineDate: {
    fontSize: 14,
    color: '#64748b',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  badgePhysical: {
    backgroundColor: '#dbeafe',
  },
  badgeVirtual: {
    backgroundColor: '#ede9fe',
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  deviceText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIdLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 4,
  },
  cardId: {
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'monospace',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  rawInfo: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
});