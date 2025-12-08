import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AttendanceCard({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.user}>{item.user}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text style={styles.date}>{item.date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
    
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  user: { fontWeight: '600', fontSize: 15, color: '#0f172a' },
  time: { fontSize: 13, color: '#64748b' },
  date: { marginTop: 6, fontSize: 13, color: '#94a3b8' }
});
