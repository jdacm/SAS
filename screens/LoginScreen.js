import React, { useState } from 'react';
import { 
  Text, 
  Pressable, 
  StyleSheet, 
  View, 
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update display name
        await userCredential.user.updateProfile({
          displayName: name
        });
        Alert.alert('Success', 'Account created successfully!');
        console.log('User created:', userCredential.user.email);
      } else {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Logged in successfully!');
        console.log('User logged in:', userCredential.user.email);
      }
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already in use. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        case 'auth/user-not-found':
          errorMessage = 'User not found. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Attendance System</Text>
              <Text style={styles.subtitle}>
                Sign {isSignUp ? 'Up' : 'In'} to continue
              </Text>
            </View>
            
            <View style={styles.loginCard}>
              <View style={styles.toggleContainer}>
                <Pressable 
                  style={[styles.toggleButton, !isSignUp && styles.activeToggle]}
                  onPress={() => {
                    setIsSignUp(false);
                    resetForm();
                  }}
                >
                  <Text style={[styles.toggleText, !isSignUp && styles.activeToggleText]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable 
                  style={[styles.toggleButton, isSignUp && styles.activeToggle]}
                  onPress={() => {
                    setIsSignUp(true);
                    resetForm();
                  }}
                >
                  <Text style={[styles.toggleText, isSignUp && styles.activeToggleText]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>
              
              <View style={styles.form}>
                {isSignUp && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                )}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                  <Text style={styles.passwordHint}>
                    {isSignUp ? 'Minimum 6 characters' : ''}
                  </Text>
                </View>
                
                <Pressable 
                  style={[styles.button, loading && styles.buttonDisabled]} 
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </Pressable>
                
                <Pressable 
                  style={styles.switchButton}
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.switchText}>
                    {isSignUp 
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up"}
                  </Text>
                </Pressable>
              </View>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Demo Accounts</Text>
                <Text style={styles.infoText}>For testing, you can use:</Text>
                <Text style={styles.demoAccount}>Email: test@example.com</Text>
                <Text style={styles.demoAccount}>Password: password123</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: { 
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: '#64748b', 
    textAlign: 'center'
  },
  loginCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginBottom: 24,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: '600',
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  passwordHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  button: { 
    backgroundColor: '#06b6d4', 
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
    color: '#06b6d4',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#0369a1',
    marginBottom: 4,
  },
  demoAccount: {
    fontSize: 13,
    color: '#0369a1',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});