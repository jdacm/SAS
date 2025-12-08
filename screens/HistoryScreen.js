import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
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
            .sort((a, b) => b.timestamp - a.timestamp);
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

  const formatDate = (timestamp) => {
    const dateObj = new Date(timestamp);
    const phDate = dateObj.toLocaleDateString('en-PH', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    });
    const phTime = dateObj.toLocaleTimeString('en-PH', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    });
    return { date: phDate, time: phTime };
  };

  const groupByDate = (records) => {
    const groups = {};
    records.forEach(record => {
      const dateObj = new Date(record.timestamp);
      const dateKey = dateObj.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });
    return groups;
  };

  const renderItem = ({ item }) => {
    const { date, time } = formatDate(item.timestamp);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>NFC</Text>
          </View>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.date}>{date}</Text>
        {item.nfcUid && (
          <View style={styles.cardIdRow}>
            <Text style={styles.cardIdLabel}>Card:</Text>
            <Text style={styles.cardId}>{item.nfcUid}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (date, records) => (
    <View key={date} style={styles.section}>
      <Text style={styles.sectionTitle}>{date}</Text>
      {records.map(record => {
        const { time } = formatDate(record.timestamp);
        return (
          <View key={record.id} style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineTime}>{time}</Text>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodBadgeText}>NFC Check-in</Text>
                </View>
              </View>
              {record.nfcUid && (
                <Text style={styles.timelineCardId}>Card: {record.nfcUid}</Text>
              )}
            </View>
          </View>
        );
      })}
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

  const groupedAttendance = groupByDate(attendance);
  const sections = Object.entries(groupedAttendance);

  return (
    <ScreenContainer>
      <View style={styles.inner}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>Your check-in records</Text>
        
        {attendance.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptySubtitle}>
              Check in using NFC or QR code to see your history here
            </Text>
          </View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={([date]) => date}
            renderItem={({ item: [date, records] }) => renderSection(date, records)}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
    paddingLeft: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#06b6d4',
    marginRight: 12,
    marginTop: 4,
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
    marginBottom: 8,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  methodBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  timelineCardId: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'monospace',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
});