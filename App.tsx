import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from './src/supabase';
import { Session } from '@supabase/supabase-js';
import { Analytics } from "@vercel/analytics/next"

// Import your screens
import AuthScreen from './src/AuthScreen';
import PassengerScreen from './src/PassengerScreen';
import DriverScreen from './src/DriverScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'DRIVER' | 'PASSENGER' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in when app opens
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes (e.g. user logs in or out)
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });
  }, []);

  // Grabs the user's role from the public.users table
const fetchUserRole = async (userId: string) => {
    console.log("Attempting to fetch role for User ID:", userId);

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Database Error:", error.message);
      alert("Error fetching role: " + error.message);
    }

    if (data) {
      console.log("Successfully fetched role:", data.role);
      setUserRole(data.role);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If there is no active session, show the Login/Signup screen
  if (!session || !session.user) {
    return <AuthScreen />;
  }

  // If they are logged in, show the correct screen based on their role
  if (userRole === 'DRIVER') {
    // Note: You'll need logic to handle activePartyId later
    return <DriverScreen userId={session.user.id} />;
    
  }

  if (userRole === 'PASSENGER') {
    return <PassengerScreen userId={session.user.id} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Error loading user role.</Text>
    </View>
  );
}