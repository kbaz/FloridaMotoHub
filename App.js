import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Modal, ScrollView, Linking, RefreshControl } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// --- YOUR REMOTE CLOUD DATA LINK ---
const REMOTE_DATA_URL = 'https://gist.githubusercontent.com/kbaz/c2886ea1a98d17afa45565332504ef98/raw/motohub.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  // Data State
  const [tracks, setTracks] = useState([]);
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  
  // Radar State
  const [radarFrames, setRadarFrames] = useState([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [showRadar, setShowRadar] = useState(true);

  // --- FETCH REMOTE CLOUD DATA ---
  const fetchCloudData = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(REMOTE_DATA_URL);
      const json = await response.json();
      setTracks(json.tracks || []);
      setEvents(json.events || []);
    } catch (error) {
      console.log('Failed to fetch remote data.');
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCloudData();

    // Fetch RainViewer Radar Frames (Past frames + Nowcast prediction)
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.host && data.radar) {
          let frames = [];
          if (data.radar.past) frames = [...data.radar.past];
          if (data.radar.nowcast) frames = [...frames, ...data.radar.nowcast];
          
          const formattedFrames = frames.map(f => {
            const date = new Date(f.time * 1000);
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const mins = date.getMinutes().toString().padStart(2, '0');
            return {
              timeText: `${hours}:${mins} ${ampm}`,
              url: `${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`
            };
          });
          setRadarFrames(formattedFrames);
          setActiveFrameIndex(formattedFrames.length > 0 ? formattedFrames.length - 1 : 0);
        }
      })
      .catch(err => console.log('Radar error:', err));
  }, []);

  // --- FETCH LOCAL TRACK WEATHER & 3-DAY FORECAST ---
  useEffect(() => {
    if (selectedTrack && selectedTrack.lat && selectedTrack.lon) {
      setLoadingWeather(true);
      setWeatherData(null);
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedTrack.lat}&longitude=${selectedTrack.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York`)
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

  const renderDetailedWeather = () => {
    if (loadingWeather) return <View style={styles.weatherCard}><Text style={styles.weatherLoadingText}>Fetching local forecasts...</Text></View>;
    if (!weatherData || !weatherData.daily) return null;

    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeaderRow}>
          <Ionicons name={getWeatherIcon(weatherData.current.weather_code)} size={42} color="#e67e22" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.weatherMainTemp}>{Math.round(weatherData.current.temperature_2m)}°F</Text>
            <Text style={styles.weatherFeelsLike}>Current Surface Temp</Text>
          </View>
        </View>

        <View style={styles.weatherMetricsGrid}>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-lightning-rainy" size={24} color="#3498db" />
            <Text style={styles.metricLabel}>Rain Today</Text>
            <Text style={styles.metricValue}>{weatherData.daily.precipitation_probability_max[0]}%</Text>
          </View>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-windy" size={24} color="#1abc9c" />
            <Text style={styles.metricLabel}>Live Wind</Text>
            <Text style={styles.metricValue}>{Math.round(weatherData.current.wind_speed_10m)} mph</Text>
          </View>
        </View>

        {/* 3-DAY FORECAST GRID */}
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>3-Day Prediction</Text>
          <View style={styles.forecastRow}>
            {[1, 2, 3].map(i => {
              const dayDate = new Date(weatherData.daily.time[i] + 'T12:00:00Z');
              return (
                <View key={i} style={styles.forecastDay}>
                  <Text style={styles.forecastDayText}>{dayDate.toLocaleDateString('en-US', {weekday: 'short'})}</Text>
                  <Ionicons name={getWeatherIcon(weatherData.daily.weather_code[i])} size={24} color="#e67e22" style={{marginVertical: 4}} />
                  <Text style={styles.forecastTemp}>{Math.round(weatherData.daily.temperature_2m_max[i])}°</Text>
                  <Text style={styles.forecastRain}>{weatherData.daily.precipitation_probability_max[i]}% rain</Text>
                </View>
              );
            })}
          </View>
        </View>
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
              <Text style={styles.infoText}><Text style={styles.boldText}>Address:</Text> {selectedTrack?.address}</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Hours:</Text> {selectedTrack?.hours}</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Notes:</Text> {selectedTrack?.notes}</Text>
            </View>

            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => {
                if (selectedTrack?.social) Linking.openURL(selectedTrack.social);
              }}
            >
              <MaterialCommunityIcons name="web" size={22} color="#fff" />
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

      {/* DIRECTORY TAB */}
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

      {/* MAP & RADAR TAB */}
      {activeTab === 'map' && (
        <View style={styles.tabContent}>
          <MapView 
            style={styles.map}
            initialRegion={{ latitude: 28.565, longitude: -81.586, latitudeDelta: 3.5, longitudeDelta: 3.5 }}
          >
            {showRadar && radarFrames.length > 0 && (
              <UrlTile urlTemplate={radarFrames[activeFrameIndex].url} zIndex={1} opacity={0.65} />
            )}
            {tracks.filter(t => t.lat && t.lon).map((track) => (
              <Marker key={track.id} coordinate={{ latitude: track.lat, longitude: track.lon }} title={track.name} onCalloutPress={() => setSelectedTrack(track)} />
            ))}
          </MapView>
          
          {/* RADAR TIMELINE CONTROLS */}
          <View style={styles.radarControls}>
            <View style={styles.radarHeader}>
              <Text style={styles.radarTitle}>Live Radar Timeline</Text>
              <TouchableOpacity onPress={() => setShowRadar(!showRadar)}>
                <Text style={styles.radarToggle}>{showRadar ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
            {showRadar && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                {radarFrames.map((frame, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.timeButton, activeFrameIndex === index && styles.timeButtonActive]}
                    onPress={() => setActiveFrameIndex(index)}
                  >
                    <Text style={[styles.timeText, activeFrameIndex === index && styles.timeTextActive]}>{frame.timeText}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* EVENTS TAB */}
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
          <MaterialCommunityIcons name="map-marker-radius" size={26} color={activeTab === 'map' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Map</Text>
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
  
  // Radar Timeline UI
  radarControls: { position: 'absolute', bottom: 20, left: 10, right: 10, backgroundColor: 'rgba(24,24,24,0.9)', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333' },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  radarTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  radarToggle: { color: '#e67e22', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  timelineScroll: { flexDirection: 'row' },
  timeButton: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#333', borderRadius: 20, marginRight: 10 },
  timeButtonActive: { backgroundColor: '#e67e22' },
  timeText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  timeTextActive: { color: '#fff' },

  // Track Lists
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
  
  // Modals & Weather
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
  weatherMetricsGrid: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#2e2e2e', paddingTop: 14, paddingBottom: 14 },
  metricItem: { alignItems: 'center' },
  metricLabel: { color: '#777', fontSize: 11, marginTop: 3, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { color: '#eee', fontSize: 16, fontWeight: '800', marginTop: 1 },
  
  // 3-Day Forecast
  forecastContainer: { borderTopWidth: 1, borderTopColor: '#2e2e2e', paddingTop: 14 },
  forecastTitle: { color: '#777', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  forecastDay: { alignItems: 'center' },
  forecastDayText: { color: '#ddd', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  forecastTemp: { color: '#fff', fontSize: 14, fontWeight: '800' },
  forecastRain: { color: '#3498db', fontSize: 11, fontWeight: 'bold', marginTop: 2 },

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