import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { supabase } from './supabase';

export default function DriverScreen({ userId }: { userId: string }) {
  const [activeParty, setActiveParty] = useState<any>(null);
  const [maxSeats, setMaxSeats] = useState('4');
  const [timeStart, setTimeStart] = useState('08:30:00');
  const [timeEnd, setTimeEnd] = useState('09:15:00');

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptedPassengers, setAcceptedPassengers] = useState<any[]>([]);
  const [assignedTimes, setAssignedTimes] = useState<Record<string, string>>({});
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveParty();
  }, []);

  useEffect(() => {
    if (!activeParty) return;

    fetchRequests(activeParty.id);

    const subscription = supabase
      .channel('driver_dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => {
        fetchRequests(activeParty.id);
        fetchActiveParty(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [activeParty?.id]);

  const fetchActiveParty = async () => {
    const { data } = await supabase
      .from('ride_parties')
      .select('*')
      .eq('driver_id', userId)
      .in('status', ['OPEN', 'CLOSED'])
      .maybeSingle();

    setActiveParty(data);
  };

  const fetchRequests = async (partyId: string) => {
    const { data: pending } = await supabase.from('ride_requests').select('*, users(name)').eq('status', 'PENDING');
    const { data: accepted } = await supabase.from('ride_requests').select('*, users(name, phone_number)').eq('party_id', partyId).eq('status', 'ACCEPTED');

    if (pending) setPendingRequests(pending);
    if (accepted) setAcceptedPassengers(accepted);

    setAssignedTimes(prev => {
      const newTimes = { ...prev };
      pending?.forEach(req => {
        if (newTimes[req.id] === undefined) newTimes[req.id] = req.time_preference || timeStart;
      });
      accepted?.forEach(req => {
        if (newTimes[req.id] === undefined) newTimes[req.id] = req.assigned_time || '';
      });
      return newTimes;
    });
  };

  // ==========================================
  // DRIVER ACTIONS
  // ==========================================
  const createParty = async () => {
    const { data, error } = await supabase
      .from('ride_parties')
      .insert({
        driver_id: userId, max_seats: parseInt(maxSeats), available_seats: parseInt(maxSeats),
        time_range_start: timeStart, time_range_end: timeEnd, status: 'OPEN'
      }).select().single();
    if (error) alert('Error creating party: ' + error.message);
    else setActiveParty(data);
  };

  const togglePartyStatus = async () => {
    const newStatus = activeParty.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    const { error } = await supabase.from('ride_parties').update({ status: newStatus }).eq('id', activeParty.id);
    if (error) alert('Error updating status: ' + error.message);
    else fetchActiveParty();
  };

  const markPartyFinished = async () => {
    const { error } = await supabase.from('ride_parties').update({ status: 'FINISHED' }).eq('id', activeParty.id);
    if (error) alert('Error finishing party: ' + error.message);
    else setActiveParty(null);
  };

  const handleTimeChange = (reqId: string, time: string) => {
    setAssignedTimes(prev => ({ ...prev, [reqId]: time }));
  };

  const acceptRequest = async (requestId: string) => {
    setIsProcessingId(requestId);
    const assignedTime = assignedTimes[requestId] || activeParty.time_range_start;

    // 1. Link the passenger to this party. 
    // The SQL Trigger will instantly and securely update the seat count in the background!
    const { data: updatedRequest, error: reqError } = await supabase
      .from('ride_requests')
      .update({ status: 'ACCEPTED', party_id: activeParty.id, assigned_time: assignedTime })
      .eq('id', requestId)
      .select();

    if (reqError) {
      alert('Database Error: ' + reqError.message);
      setIsProcessingId(null);
      return;
    }

    if (!updatedRequest || updatedRequest.length === 0) {
      alert('Could not accept. The request may have been canceled.');
      setIsProcessingId(null);
      return;
    }

    // 2. Fetch the fresh, accurate data directly from the database
    fetchActiveParty();
    fetchRequests(activeParty.id);
    setIsProcessingId(null);
  };

  const updateAssignedTime = async (requestId: string) => {
    const timeToSave = assignedTimes[requestId] || '';
    const { error } = await supabase
      .from('ride_requests')
      .update({ assigned_time: timeToSave })
      .eq('id', requestId);
    
    if (error) alert('Error updating time: ' + error.message);
    else alert('Time updated successfully!');
  };

  const kickPassenger = async (requestId: string) => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'PENDING', party_id: null })
      .eq('id', requestId);
    
    if (error) alert('Error removing passenger: ' + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==========================================
  // UI RENDERS
  // ==========================================
  if (activeParty) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.header}>Your Ride Party is {activeParty.status}</Text>
          <Text>Seats Remaining: {activeParty.available_seats} / {activeParty.max_seats}</Text>
          <Text>Pickup Window: {activeParty.time_range_start} - {activeParty.time_range_end}</Text>
          
          <View style={styles.actionRow}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Button 
                title={activeParty.status === 'OPEN' ? "Pause Requests" : "Re-Open Party"} 
                onPress={togglePartyStatus} 
                color={activeParty.status === 'OPEN' ? "#f0ad4e" : "#0275d8"} 
              />
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Button title="Mark Finished" onPress={markPartyFinished} color="#5cb85c" />
            </View>
          </View>
        </View>

        {/* --- PARTY MEMBERS SECTION --- */}
        <Text style={styles.subHeader}>Party Members ({acceptedPassengers.length})</Text>
        {acceptedPassengers.length === 0 ? (
          <Text style={{ fontStyle: 'italic', color: '#666' }}>No passengers accepted yet.</Text>
        ) : (
          acceptedPassengers.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: '#eefbfa', borderColor: '#b2dfdb' }]}>
              <Text style={styles.name}>{p.users?.name}</Text>
              <Text>📍 Pickup: {p.pickup_location}</Text>
              
              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Update Pickup Time:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10, backgroundColor: '#fff' }]}
                  value={assignedTimes[p.id] || ''} 
                  onChangeText={(text) => handleTimeChange(p.id, text)}
                />
                <Button title="Save" onPress={() => updateAssignedTime(p.id)} />
              </View>

              <View style={{ marginTop: 15 }}>
                <Button title="Remove Passenger" onPress={() => kickPassenger(p.id)} color="#d9534f" />
              </View>
            </View>
          ))
        )}

        {/* --- PENDING REQUESTS SECTION --- */}
        <Text style={styles.subHeader}>Pending Requests</Text>
        {pendingRequests.length === 0 ? (
          <Text style={{ fontStyle: 'italic', color: '#666' }}>No pending requests right now.</Text>
        ) : (
          pendingRequests.map((req) => (
            <View key={req.id} style={styles.card}>
              <Text style={styles.name}>{req.users?.name}</Text>
              <Text>📍 From: {req.pickup_location}</Text>
              <Text>⏰ Prefers: {req.time_preference}</Text>

              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Allocate Pickup Time:</Text>
              <TextInput
                style={[styles.input, { marginBottom: 10, marginTop: 5 }]}
                value={assignedTimes[req.id] || ''} 
                onChangeText={(text) => handleTimeChange(req.id, text)}
                placeholder="Enter time"
              />
              
              <Button 
                title={isProcessingId === req.id ? "Accepting..." : "Accept Passenger"} 
                onPress={() => acceptRequest(req.id)} 
                disabled={activeParty.available_seats <= 0 || isProcessingId !== null}
              />
            </View>
          ))
        )}

        <View style={styles.logoutContainer}>
          <Button title="Log Out" onPress={handleLogout} color="#888" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Start a Ride Party</Text>
      <Text style={styles.label}>Available Seats</Text>
      <TextInput style={styles.input} value={maxSeats} onChangeText={setMaxSeats} keyboardType="numeric" />
      <Text style={styles.label}>Earliest Pickup Time</Text>
      <TextInput style={styles.input} value={timeStart} onChangeText={setTimeStart} />
      <Text style={styles.label}>Latest Pickup Time</Text>
      <TextInput style={styles.input} value={timeEnd} onChangeText={setTimeEnd} />
      <Button title="Open Ride Party" onPress={createParty} color="#5cb85c" />
      <View style={styles.logoutContainer}>
        <Button title="Log Out" onPress={handleLogout} color="#888" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff', paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, marginTop: 25 },
  dashboardHeader: { padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  label: { fontSize: 16, marginBottom: 5, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 20, borderRadius: 8, backgroundColor: '#fff' },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 15, marginBottom: 15, borderRadius: 8, backgroundColor: '#fafafa' },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  logoutContainer: { marginTop: 40, marginBottom: 20 }
});