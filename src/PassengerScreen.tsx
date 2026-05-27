import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert, Linking, ScrollView } from 'react-native';
import { supabase } from './supabase';

export default function PassengerScreen({ userId }: { userId: string }) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [timePreference, setTimePreference] = useState('');
  
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [coPassengers, setCoPassengers] = useState<any[]>([]);
  const [availableParties, setAvailableParties] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveRequest();
    fetchAvailableParties();

    // Listen for database changes to dynamically update available drivers
    const sub = supabase
      .channel('public:ride_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchActiveRequest();
        fetchAvailableParties();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  // Fetch co-passengers only if the request is accepted
  useEffect(() => {
    if (activeRequest?.status === 'ACCEPTED' && activeRequest.party_id) {
      fetchCoPassengers(activeRequest.party_id);
    }
  }, [activeRequest]);

  const fetchActiveRequest = async () => {
    const { data } = await supabase
      .from('ride_requests')
      .select(`*, ride_parties( driver_id, users(name, phone_number) )`)
      .eq('passenger_id', userId)
      .in('status', ['PENDING', 'ACCEPTED'])
      .maybeSingle();

    setActiveRequest(data);
  };

  const fetchCoPassengers = async (partyId: string) => {
    const { data } = await supabase
      .from('ride_requests')
      .select('users(name)')
      .eq('party_id', partyId)
      .eq('status', 'ACCEPTED')
      .neq('passenger_id', userId); // Exclude the current user

    if (data) setCoPassengers(data);
  };

  const fetchAvailableParties = async () => {
    const { data } = await supabase
      .from('ride_parties')
      .select('*, users(name)')
      .eq('status', 'OPEN');

    if (data) setAvailableParties(data);
  };

  const requestRide = async () => {
    const { error } = await supabase.from('ride_requests').insert({
      passenger_id: userId,
      pickup_location: pickupLocation,
      time_preference: timePreference,
      status: 'PENDING'
    });
    if (!error) {
      setPickupLocation('');
      setTimePreference('');
      fetchActiveRequest();
    }
  };

  const cancelRequest = async () => {
    await supabase.from('ride_requests').update({ status: 'CANCELED' }).eq('id', activeRequest.id);
    setActiveRequest(null);
  };

  const leaveParty = async () => {
    // We set status to CANCELED and strip the party_id.
    // This immediately triggers the SQL function restore_seat_on_cancel() inside the DB.
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'CANCELED', party_id: null }) //the trigger.
      .eq('id', activeRequest.id);

    if (error) {
      alert('Error leaving party: ' + error.message);
    } else {
      setActiveRequest(null);
      setCoPassengers([]);
      setPickupLocation('');
      setTimePreference('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Passenger Dashboard</Text>

      {/* ============================== */}
      {/* SECTION 1: ACTIVE REQUEST */}
      {/* ============================== */}
      {activeRequest ? (
        <View style={styles.card}>
          <Text style={styles.subHeader}>Your Ride Status: {activeRequest.status}</Text>
          <Text>📍 Pickup: {activeRequest.pickup_location}</Text>
          
          {activeRequest.status === 'PENDING' && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ marginBottom: 10 }}>Waiting for a driver...</Text>
              <Button title="Cancel Request" onPress={cancelRequest} color="#d9534f" />
            </View>
          )}

          {activeRequest.status === 'ACCEPTED' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.boldText}>🚗 Driver: {activeRequest.ride_parties?.users?.name}</Text>
              <Text>⏱️ Assigned Time: {activeRequest.assigned_time}</Text>
              
              {coPassengers.length > 0 && (
                <View style={styles.coPassengerBox}>
                  <Text style={{ fontWeight: 'bold' }}>Riding with you:</Text>
                  {coPassengers.map((p, i) => (
                    <Text key={i}>- {p.users?.name}</Text>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 10 }}>
                <Button 
                  title="Message Driver on WhatsApp" 
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${activeRequest.ride_parties?.users?.phone_number}`)} 
                  color="#25D366" 
                />
              </View>

              {/* NEW LEAVE PARTY BUTTON */}
              <View style={{ marginTop: 10 }}>
                <Button 
                  title="Leave Party & Request Another" 
                  onPress={leaveParty} 
                  color="#d9534f" 
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.subHeader}>Request a Ride</Text>
          <TextInput style={styles.input} placeholder="Pickup Address" value={pickupLocation} onChangeText={setPickupLocation} />
          <TextInput style={styles.input} placeholder="Time Preference (e.g., 9:00 AM)" value={timePreference} onChangeText={setTimePreference} />
          <Button title="Submit Request" onPress={requestRide} />
        </View>
      )}

      {/* ============================== */}
      {/* SECTION 2: AVAILABLE DRIVERS */}
      {/* ============================== */}
      <Text style={[styles.subHeader, { marginTop: 20 }]}>Drivers Currently Offering Rides</Text>
      {availableParties.length === 0 ? (
        <Text>No drivers have open parties right now.</Text>
      ) : (
        availableParties.map((party) => (
          <View key={party.id} style={styles.driverCard}>
            <Text style={styles.boldText}>{party.users?.name}</Text>
            <Text>Seats available: {party.available_seats} / {party.max_seats}</Text>
            <Text>Time Window: {party.time_range_start} - {party.time_range_end}</Text>
          </View>
        ))
      )}

      <View style={styles.logoutContainer}>
        <Button title="Log Out" onPress={handleLogout} color="#888" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff', paddingTop: 40 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  driverCard: { padding: 10, borderLeftWidth: 4, borderLeftColor: '#007bff', backgroundColor: '#f4f4f4', marginBottom: 10, borderRadius: 4 },
  coPassengerBox: { marginTop: 10, padding: 10, backgroundColor: '#e9ecef', borderRadius: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8 },
  boldText: { fontWeight: 'bold', fontSize: 16 },
  logoutContainer: { marginTop: 30, marginBottom: 20 }
});