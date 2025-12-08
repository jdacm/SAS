import React, { useState } from 'react';
import { Text, View, StyleSheet, Pressable, Alert, ScrollView, Modal } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function ProfileScreen({ user }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    console.log('Logout button pressed');
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      console.log('Signing out...');
      setShowLogoutConfirm(false);
      await signOut(auth);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out: ' + error.message);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your account information</Text>
          
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user?.displayName || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>User ID</Text>
              <Text style={[styles.value, { fontSize: 12 }]}>{user?.uid || 'N/A'}</Text>
            </View>
          </View>
          
          <Pressable 
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed
            ]} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            
            <View style={styles.modalButtonContainer}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { paddingBottom: 30 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 6 },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef6fb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1
  },
  field: { paddingVertical: 12 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#eef6fb' },
  logoutButton: {
    marginTop: 32,
    marginBottom: 20,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  logoutButtonPressed: {
    backgroundColor: '#b91c1c',
    opacity: 0.9
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  confirmButton: {
    backgroundColor: '#dc2626'
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  }
});