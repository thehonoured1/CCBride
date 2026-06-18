import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, Button, Text, Switch } from 'react-native';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDriver, setIsDriver] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    
    // STEP 1: Create the secure login in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email: email, 
      password: password 
    });
    
    if (authError) {
      console.log("Auth Error:", authError.message); // Added console log for the web!
      alert('Sign Up Failed: ' + authError.message); 
      setLoading(false);
      return;
    }

    // STEP 2: Create their profile in the database
    if (authData.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id,
        name: name,
        phone_number: phone,
        role: isDriver ? 'DRIVER' : 'PASSENGER'
      });

      if (dbError) {
        console.log("Database Error:", dbError.message);
        alert('Profile Error: ' + dbError.message);
      } else {
        alert('Success! Account created and logged in.');
      }
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CCBride</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        autoCapitalize="none"
        onChangeText={setPassword}
      />

      {/* Show these extra fields only if they are signing up */}
      {!isLogin && (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="WhatsApp Number (incl. country code, numbers only.)"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
          />
          <View style={styles.switchContainer}>
            <Text>I am a Passenger</Text>
            <Switch value={isDriver} onValueChange={setIsDriver} />
            <Text>I am a Driver</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={isLogin ? 'Sign In' : 'Create Account'}
          disabled={loading}
          onPress={isLogin ? signInWithEmail : signUpWithEmail}
        />
      </View>

      <Button
        title={isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        color="gray"
        onPress={() => setIsLogin(!isLogin)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  header: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8 },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  buttonContainer: { marginBottom: 10 }
});