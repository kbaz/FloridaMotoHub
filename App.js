import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Modal, ScrollView, Linking, RefreshControl } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// --- YOUR REMOTE CLOUD DATA LINK ---
const REMOTE_DATA_URL = 'https://gist.githubusercontent.com/kbaz/c2886ea1a98d17afa45565332504ef98/raw/8f36da883add18274ced606d0d40e56b38e4732d/motohub.json'; // We will replace this in Step 2

const DEFAULT_TRACKS = [
  { id: '1', name: 'Croom Motorcycle Area', type: 'OHV / Trails', city: 'Brooksville, FL', address: '6420 La Rose Rd, Brooksville, FL 34602', lat: 28.5361, lon: -82.2355, hours: '8:00 AM - 5:00 PM Daily', social: 'https://www.fdacs.gov/Forest-Wildfire/Our-Forests/State-Forests/Withlacoochee-State-Forest/Croom-Motorcycle-Area', notes: 'Day-use & annual permits required. Sand, single-track, and pit riding.' },
  { id: '2', name: 'Ocala National Forest OHV', type: 'OHV / Trail System', city: 'Umatilla / Salt Springs, FL', address: 'Big Scrub Trailhead, Umatilla, FL 32784', lat: 29.0722, lon: -81.7161, hours: 'Daylight Hours Daily', social: 'https://www.fs.usda.gov/recarea/florida/recarea/?recid=83535', notes: '125+ miles of marked trails (Wandering Wiregrass, Lake Delancy). USFS OHV permit required.' },
  { id: '3', name: 'Orlando MX Park', type: 'Motocross Track', city: 'Bithlo, FL', address: '19400 E Colonial Dr, Orlando, FL 32820', lat: 28.5630, lon: -81.0960, hours: 'Wed & Sat: 9 AM - 2 PM, Sun: 9 AM - 4 PM', social: 'https://www.instagram.com/orlandomx/', notes: 'Full MX track, vet track, and peewee track.' },
  { id: '4', name: 'Dade City Raceway', type: 'Motocross Track', city: 'Dade City, FL', address: '33508 State Rd 52, Dade City, FL 33525', lat: 28.3278, lon: -82.2030, hours: 'Thurs Practice: 4 PM - 9 PM | Select Saturdays', social: 'https://www.facebook.com/dadecitymotocross/', notes: 'Regular night race shootouts under stadium lighting.' },
  { id: '5', name: 'Gatorback Cycle Park', type: 'Motocross Track', city: 'Alachua, FL', address: '20525 NW 46th Ave, Alachua, FL 32615', lat: 29.7460, lon: -82.5250, hours: 'Major Events & Race Weekends Only', social: 'https://www.instagram.com/gatorback_cyclepark/', notes: 'Home of the Mini O\'s. Elevation changes, natural terrain.' },
  { id: '6', name: 'Pax Trax MX', type: 'Motocross Track', city: 'Bunnell, FL', address: '2250 N State St, Bunnell, FL 32110', lat: 29.4920, lon: -81.2610, hours: 'Fri: 3 PM - Dark, Sat/Sun: 9 AM - 3 PM', social: 'https://www.facebook.com/paxtrax.mx/', notes: 'Deep Florida sand and loamy mix.' },
  { id: '7', name: 'WW Ranch Motocross Park', type: 'Motocross Track', city: 'Jacksonville, FL', address: '1439 Otis Rd, Jacksonville, FL 32220', lat: 30.3344, lon: -81.9069, hours: 'Check social for open ride weekends', social: 'https://www.facebook.com/WWRanchMotocross/', notes: 'Pro National caliber sand track.' },
  { id: '8', name: '74MX at The RCK', type: 'Motocross Track', city: 'Punta Gorda, FL', address: '42400 Bermont Rd, Punta Gorda, FL 33982', lat: 26.9350, lon: -81.9560, hours: 'Sat & Sun: 9 AM - 3 PM', social: 'https://www.instagram.com/74mx1/', notes: 'Lighted night sessions on special dates.' },
  { id: '9', name: 'Moto Bros MX', type: 'Motocross Track', city: 'Okeechobee, FL', address: '13100 US-441, Okeechobee, FL 34972', lat: 27.2430, lon: -80.8290, hours: 'Sat & Sun: 9 AM - 3 PM', social: 'https://www.instagram.com/motobros_mx/', notes: 'Fast-flowing main track and lighted turn track.' },
  { id: '10', name: 'Bone Valley ATV Park', type: 'OHV / Trails', city: 'Mulberry, FL', address: '10427 County Rd 630 W, Mulberry, FL 33860', lat: 27.8016, lon: -81.9961, hours: '8:00 AM - 5:00 PM (Closed Tue/Wed)', social: 'https://www.polk-county.net/', notes: '200 acres with hill climbs, trails, and free-ride areas.' }
];

const DEFAULT_EVENTS = [
  { id: '1', date: 'Oct 24 - 25, 2026', title: 'FTR Hare Scramble Rd 3', location: 'Bartow, FL', series: 'Florida Trail Riders' },
  { id: '2', date: 'Nov 07 - 08, 2026', title: 'FTR Hare Scramble Rd 4', location: 'Ona, FL', series: 'Florida Trail Riders' },
  { id: '3', date: 'Nov 21, 2026', title: 'Saturday Night Under The Lights', location: 'Dade City Raceway', series: 'Local MX' },
  { id: '4', date: 'Nov 23 - 28, 2026', title: '55th Thor Winter Olympics (Mini O\'s)', location: 'Gatorback Cycle Park', series: 'National Amateur SX/MX' },
  { id: '5', date: 'Dec 05 - 06, 2026', title: 'FTR Hare Scramble Rd 5', location: 'Seminole Tribe / Brighton, FL', series: 'Florida Trail Riders' },
  { id: '6', date: 'Mar 07 - 08, 2027', title: 'The Wild Boar GNCC', location: 'Hog Waller (Palatka, FL)', series: 'Grand National Cross Country' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  // Data State
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [refreshing, setRefreshing] = useState(false);

  // Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [radarTileUrl, setRadarTileUrl] = useState(null);

  // --- FETCH REMOTE DATA ---
  const fetchCloudData = async () => {
    setRefreshing(true);
    try {
      if (REMOTE_DATA_URL.startsWith('http')) {
        const response = await fetch(REMOTE_DATA_URL);
        const json = await response.json();
        setTracks(json.tracks || DEFAULT_TRACKS);
        setEvents(json.events || DEFAULT_EVENTS);
      } else {
        setTracks(DEFAULT_TRACKS);
        setEvents(DEFAULT_EVENTS);
      }
    } catch (error) {
      console.log('Using local fallback data.');
      setTracks(DEFAULT_TRACKS);
      setEvents(DEFAULT_EVENTS);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCloudData(); // Load on boot

    // Load Live Weather Radar Overlay from RainViewer API
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.host && data.radar && data.radar.past) {
          const latest = data.radar.past[data.radar.past.length - 1].path;
          setRadarTileUrl(`${data.host}${latest}/256/{z}/{x}/{y}/2/1_1.png`); // color scheme 2, smooth 1
        }
      })
      .catch(err => console.log('Radar error:', err));
  }, []);

  // --- FETCH LOCAL WEATHER ---
  useEffect(() => {
    if (selectedTrack && selectedTrack.lat && selectedTrack.lon) {
      setLoadingWeather(true);
      setWeatherData(null);
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedTrack.lat}&longitude=${selectedTrack.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current) setWeatherData(data);
          setLoadingWeather(false);
        })
        .catch(() => setLoadingWeather(false));
    }
  }, [selectedTrack]);

  const getWeatherIcon = (code) => {
    if (code >= 95) return 'thunderstorm';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 45 && code <= 48) return 'cloud';
    if (code > 0 && code <= 3) return 'partly-sunny';
    return 'sunny';
  };

  const getWeatherAlert = () => {
    if (!weatherData || !weatherData.current || !weatherData.daily) return null;
    const rainChance = weatherData.daily.precipitation_probability_max[0];
    const code = weatherData.current.weather_code;
    
    if (code >= 95) return { text: "⚠️ ACTIVE THUNDERSTORMS", color: '#e74c3c' };
    if (code >= 51 && code <= 67) return { text: "🌧️ CURRENTLY RAINING", color: '#3498db' };
    if (rainChance > 40) return { text: `High Storm Risk Today (${rainChance}% Chance)`, color: '#f39c12' };
    if (rainChance > 10) return { text: `Slight Rain Risk (${rainChance}% Chance)`, color: '#95a5a6' };
    return { text: "Clear Conditions Expected", color: '#27ae60' };
  };

  const renderDetailedWeather = () => {
    if (loadingWeather) {
      return (
        <View style={styles.weatherCard}>
          <Text style={styles.weatherLoadingText}>Fetching current radar & conditions...</Text>
        </View>
      );
    }
    if (!weatherData) return null;

    const alert = getWeatherAlert();

    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeaderRow}>
          <Ionicons name={getWeatherIcon(weatherData.current.weather_code)} size={42} color="#e67e22" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.weatherMainTemp}>{Math.round(weatherData.current.temperature_2m)}°F</Text>
            <Text style={styles.weatherFeelsLike}>Track Surface Temp</Text>
          </View>
        </View>

        <View style={styles.weatherMetricsGrid}>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-lightning-rainy" size={24} color="#3498db" />
            <Text style={styles.metricLabel}>Rain Chance</Text>
            <Text style={styles.metricValue}>{weatherData.daily.precipitation_probability_max[0]}%</Text>
          </View>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-windy" size={24} color="#1abc9c" />
            <Text style={styles.metricLabel}>Wind</Text>
            <Text style={styles.metricValue}>{Math.round(weatherData.current.wind_speed_10m)} mph</Text>
          </View>
        </View>

        {alert && (
          <View style={[styles.weatherAlert, { backgroundColor: alert.color + '15', borderColor: alert.color }]}>
            <Text style={[styles.weatherAlertText, { color: alert.color }]}>{alert.text}</Text>
          </View>
        )}
      </View>
    );
  };

  const TrackModal = () => (
    <Modal visible={!!selectedTrack} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedTrack(null)}>
            <Ionicons name="close-circle" size={32} color="#7f8c8d" />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{selectedTrack?.name}</Text>
            <Text style={styles.modalSubtitle}>{selectedTrack?.city} • {selectedTrack?.type}</Text>

            {renderDetailedWeather()}

            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Facility Details</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Address:</Text> {selectedTrack?.address || 'TBD'}</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Hours:</Text> {selectedTrack?.hours || 'TBD'}</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Notes:</Text> {selectedTrack?.notes || 'No notes available.'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => {
                if (selectedTrack?.social) Linking.openURL(selectedTrack.social);
                else alert('No updates link configured.');
              }}
            >
              <MaterialCommunityIcons 
                name={selectedTrack?.social?.includes('instagram') ? 'instagram' : selectedTrack?.social?.includes('facebook') ? 'facebook' : 'web'} 
                size={22} 
                color="#fff" 
              />
              <Text style={styles.socialButtonText}>Official Info & Updates</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FL MOTO HUB</Text>
      </View>

      {activeTab === 'directory' && (
        <View style={styles.tabContent}>
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchCloudData} tintColor="#e67e22" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.trackCard} onPress={() => setSelectedTrack(item)}>
                <View style={styles.trackCardLeft}>
                  <Text style={styles.trackName}>{item.name}</Text>
                  <Text style={styles.trackType}>{item.type}</Text>
                </View>
                <View style={styles.trackCardRight}>
                  <Text style={styles.trackCity}>{item.city.split(',')[0]}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#7f8c8d" />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {activeTab === 'map' && (
        <View style={styles.tabContent}>
          <MapView 
            style={styles.map}
            initialRegion={{ latitude: 28.565, longitude: -81.586, latitudeDelta: 3.5, longitudeDelta: 3.5 }}
          >
            {radarTileUrl && (
              <UrlTile urlTemplate={radarTileUrl} zIndex={1} opacity={0.65} />
            )}
            {tracks.filter(t => t.lat && t.lon).map((track) => (
              <Marker key={track.id} coordinate={{ latitude: track.lat, longitude: track.lon }} title={track.name} description={track.type} onCalloutPress={() => setSelectedTrack(track)} />
            ))}
          </MapView>
        </View>
      )}

      {activeTab === 'events' && (
        <View style={styles.tabContent}>
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchCloudData} tintColor="#e67e22" />}
            renderItem={({ item }) => (
              <View style={styles.eventCard}>
                <View style={styles.eventDateBox}>
                  <Text style={styles.eventDateText}>{item.date.split(',')[0]}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventLocation}>{item.location}</Text>
                  <Text style={styles.eventSeries}>{item.series}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      <TrackModal />

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('directory')}>
          <MaterialCommunityIcons name="format-list-bulleted" size={26} color={activeTab === 'directory' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'directory' && styles.navTextActive]}>Tracks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}>
          <MaterialCommunityIcons name="radar" size={26} color={activeTab === 'map' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Radar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('events')}>
          <MaterialCommunityIcons name="calendar-check" size={26} color={activeTab === 'events' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'events' && styles.navTextActive]}>Events</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { paddingVertical: 18, backgroundColor: '#181818', borderBottomWidth: 1, borderBottomColor: '#282828' },
  headerTitle: { color: '#e67e22', fontSize: 22, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginTop: 15 },
  tabContent: { flex: 1 },
  map: { width: '100%', height: '100%' },
  trackCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#161616' },
  trackCardLeft: { flex: 1 },
  trackName: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  trackType: { color: '#888', fontSize: 13, marginTop: 4 },
  trackCity: { color: '#e67e22', fontSize: 13, marginRight: 8, fontWeight: '600' },
  trackCardRight: { flexDirection: 'row', alignItems: 'center' },
  eventCard: { flexDirection: 'row', marginHorizontal: 12, marginVertical: 8, backgroundColor: '#181818', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#282828' },
  eventDateBox: { backgroundColor: '#e67e22', padding: 12, justifyContent: 'center', alignItems: 'center', width: 95 },
  eventDateText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 14 },
  eventInfo: { padding: 14, flex: 1 },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  eventLocation: { color: '#aaa', fontSize: 13, marginTop: 3 },
  eventSeries: { color: '#e67e22', fontSize: 11, marginTop: 6, fontWeight: '800', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#181818', height: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  closeButton: { alignSelf: 'flex-end', marginBottom: 6 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 18 },
  weatherCard: { backgroundColor: '#222', padding: 16, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#333' },
  weatherHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  weatherMainTemp: { color: '#fff', fontSize: 32, fontWeight: '900' },
  weatherFeelsLike: { color: '#888', fontSize: 13, marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  weatherLoadingText: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  weatherMetricsGrid: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#2e2e2e', paddingTop: 14 },
  metricItem: { alignItems: 'center' },
  metricLabel: { color: '#777', fontSize: 11, marginTop: 3, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { color: '#eee', fontSize: 16, fontWeight: '800', marginTop: 1 },
  weatherAlert: { marginTop: 18, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  weatherAlertText: { fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  infoSection: { backgroundColor: '#121212', padding: 16, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#222' },
  sectionHeader: { color: '#e67e22', fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { color: '#ddd', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  boldText: { fontWeight: '700', color: '#888' },
  socialButton: { backgroundColor: '#e67e22', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  socialButtonText: { color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 8 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#181818', borderTopWidth: 1, borderTopColor: '#282828', paddingBottom: 25, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#777', fontSize: 11, marginTop: 3, fontWeight: '600' },
  navTextActive: { color: '#e67e22' },
});