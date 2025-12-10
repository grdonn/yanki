import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  NativeModules,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { BleManager } from 'react-native-ble-plx';
import Geolocation from '@react-native-community/geolocation';
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

const bleManager = new BleManager();

// Setup Sound
Sound.setCategory('Playback');

// Assembly Points
const ASSEMBLY_POINTS = [
  { id: 1, title: "Maçka Parkı", lat: 41.0416, long: 28.9950 },
  { id: 2, title: "Gülhane Parkı", lat: 41.0128, long: 28.9809 },
  { id: 3, title: "Moda Sahili", lat: 40.9837, long: 29.0287 },
  { id: 4, title: "Yıldız Parkı", lat: 41.0490, long: 29.0120 },
  { id: 5, title: "Özgürlük Parkı", lat: 40.9780, long: 29.0580 },
];

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

function App(): React.JSX.Element {
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [nearestPoint, setNearestPoint] = useState<any>(null);

  // Tools State
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isSirenOn, setIsSirenOn] = useState(false);
  const [sirenSound, setSirenSound] = useState<Sound | null>(null);

  // Identity State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [name, setName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const watchId = useRef<number | null>(null);
  const locationFound = useRef(false);

  useEffect(() => {
    checkPermissionsAndLocate();
    loadProfile();

    // Preload sound
    const s = new Sound('siren.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load siren', error);
        return;
      }
      s.setNumberOfLoops(-1); // Loop infinitely
    });
    setSirenSound(s);

    return () => {
      s.release();
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const checkPermissionsAndLocate = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);

        if (granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted') {
          startLocationTracking();
        } else {
          Alert.alert("İzin Hatası", "Konum izni verilmedi.");
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      startLocationTracking();
    }
  };

  const updateLocationState = (lat: number, long: number) => {
    locationFound.current = true;
    setUserLocation({ latitude: lat, longitude: long });

    let minDistance = Infinity;
    let closest = null;

    ASSEMBLY_POINTS.forEach(point => {
      const dist = getDistanceFromLatLonInKm(lat, long, point.lat, point.long);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...point, distance: dist.toFixed(2) };
      }
    });

    setNearestPoint(closest);

    setRegion(prev => ({
      ...prev,
      latitude: lat,
      longitude: long,
    }));
  };

  /* FAIL-SAFE LOCATION STRATEGY */
  const startLocationTracking = () => {
    if (watchId.current !== null) Geolocation.clearWatch(watchId.current);

    // 1. QUICK FIX: Try to get Low Accuracy Location immediately (Network/Wifi)
    Geolocation.getCurrentPosition(
      (position) => {
        console.log("Quick Fix Location Found:", position);
        updateLocationState(position.coords.latitude, position.coords.longitude);
      },
      (error) => console.log("Quick Fix Error:", error),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
    );

    // 2. TIMEOUT FALLBACK: If nothing found in 5s, default to Map Center (Istanbul)
    setTimeout(() => {
      if (!locationFound.current) {
        console.log("Location Timeout: Falling back to Map Center");
        // Default to initial region (Istanbul) so "Waiting" text Disappears
        updateLocationState(41.0082, 28.9784);
        Alert.alert("Konum Tahmini", "GPS sinyali zayıf. Varsayılan merkez nokta gösteriliyor.");
      }
    }, 5000);

    // 3. CONTINUOUS WATCH (High Accuracy)
    watchId.current = Geolocation.watchPosition(
      (position) => {
        updateLocationState(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.log('Watch Position Error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000
      }
    );
  };

  // --- FEATURES ---

  /*
  const toggleTorch = async () => {
    // Explicit permission check just in case
    if (Platform.OS === 'android') {
      const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (!hasPerm) {
        Alert.alert("İzin Gerekli", "Fener için kamera izni gerekiyor.");
        return;
      }
    }

    try {
      const newState = !isTorchOn;
      await Torch.switchState(newState);
      setIsTorchOn(newState);
    } catch (e: any) {
      console.warn('Torch Error:', e);
      setIsTorchOn(false);
      Alert.alert("GÜNCEL SÜRÜM", "Hata Detayı: " + e.message);
    }
  };
  */

  // --- NEW FLASHLIGHT IMPLEMENTATION ---
  const { Flashlight } = NativeModules;

  const toggleTorch = () => {
    try {
      if (!isTorchOn) {
        Flashlight.turnOn();
        setIsTorchOn(true);
      } else {
        Flashlight.turnOff();
        setIsTorchOn(false);
      }
    } catch (e: any) {
      Alert.alert("Hata", "Fener hatası: " + e.message);
      setIsTorchOn(false);
    }
  };

  const toggleSiren = () => {
    if (!sirenSound) {
      Alert.alert("Hata", "Siren sesi yüklenemedi (Dosya eksik olabilir).");
      return;
    }
    try {
      if (isSirenOn) {
        sirenSound.stop();
        setIsSirenOn(false);
      } else {
        sirenSound.play((success) => {
          if (!success) {
            Alert.alert("Hata", "Siren çalınırken bir hata oluştu.");
            setIsSirenOn(false);
          }
        });
        setIsSirenOn(true);
      }
    } catch (err) {
      Alert.alert("Hata", "Siren modülü hatası.");
      console.warn(err);
      setIsSirenOn(false);
    }
  };

  const startRadar = () => {
    if (isScanning) {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      return;
    }
    setIsScanning(true);
    setFoundDevices(0);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (device) setFoundDevices(prev => prev + 1);
    });
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      Alert.alert("Tarama Bitti", `Çevrede ${foundDevices} sinyal algılandı.`);
    }, 15000);
  };

  const sendSafeSMS = () => {
    if (!userLocation) {
      Alert.alert("Konum Bekleniyor", "Lütfen mavi noktanın gelmesini bekleyin.");
      return;
    }
    const mapLink = `https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`;
    const message = `ACİL DURUM! GÜVENDEYİM. Konumum: ${mapLink}`;

    // NATIVE LINKING (Robust)
    const url = `sms:?body=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (!supported) {
        Alert.alert("Hata", "SMS uygulaması bulunamadı.");
      } else {
        return Linking.openURL(url);
      }
    }).catch(err => console.error('An error occurred', err));
  };

  // --- IDENTITY LOGIC ---
  const loadProfile = async () => {
    try {
      const savedName = await AsyncStorage.getItem('name');
      const savedBlood = await AsyncStorage.getItem('bloodType');
      const savedPhone = await AsyncStorage.getItem('emergencyPhone');
      const savedNotes = await AsyncStorage.getItem('notes');

      if (savedName || savedBlood) {
        if (savedName) setName(savedName);
        if (savedBlood) setBloodType(savedBlood);
        if (savedPhone) setEmergencyPhone(savedPhone);
        if (savedNotes) setNotes(savedNotes);
        setIsSaved(true);
      }
    } catch (e) {
      console.log('Failed to load profile', e);
    }
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('name', name);
      await AsyncStorage.setItem('bloodType', bloodType);
      await AsyncStorage.setItem('emergencyPhone', emergencyPhone);
      await AsyncStorage.setItem('notes', notes);
      setIsSaved(true);
      Alert.alert("Başarılı", "Kimlik bilgileriniz kaydedildi.");
    } catch (e) {
      Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>[Yankı] - Afet Asistanı</Text>
      </View>

      {/* MAP SECTION */}
      <View style={styles.mapSection}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {ASSEMBLY_POINTS.map((p) => {
            const isNearest = nearestPoint && nearestPoint.id === p.id;
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.long }}
                title={p.title + (isNearest ? " (EN YAKIN)" : "")}
                description={isNearest ? `Mesafe: ${nearestPoint.distance} km` : "Güvenli Alan"}
                pinColor={isNearest ? "orange" : "red"}
              />
            );
          })}
          {userLocation && nearestPoint && (
            <Polyline
              coordinates={[
                userLocation,
                { latitude: nearestPoint.lat, longitude: nearestPoint.long }
              ]}
              strokeColor="#FFD700"
              strokeWidth={4}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>

        {/* INFO OVERLAY */}
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            {nearestPoint
              ? `📍 En Yakın: ${nearestPoint.title} \n (${nearestPoint.distance} km)`
              : "Konum Bekleniyor..."}
          </Text>
        </View>
      </View>

      {/* TOOLS GRID */}
      <View style={styles.gridContainer}>

        <TouchableOpacity
          style={[styles.gridButton, isTorchOn ? styles.activeBtn : styles.inactiveBtn]}
          onPress={toggleTorch}
        >
          <Text style={styles.btnEmoji}>🔦</Text>
          <Text style={styles.btnLabel}>{isTorchOn ? "AÇIK" : "FENER"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, isSirenOn ? styles.alarmBtn : styles.inactiveBtn]}
          onPress={toggleSiren}
        >
          <Text style={styles.btnEmoji}>📢</Text>
          <Text style={styles.btnLabel}>{isSirenOn ? "ÇALIYOR" : "SİREN"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, isScanning ? styles.scanningBtn : styles.inactiveBtn]}
          onPress={startRadar}
        >
          {isScanning
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnEmoji}>📡</Text>
          }
          <Text style={styles.btnLabel}>{isScanning ? `TARANIYOR...` : "RADAR"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, styles.smsBtn]}
          onPress={sendSafeSMS}
        >
          <Text style={styles.btnEmoji}>💬</Text>
          <Text style={styles.btnLabel}>SMS GÖNDER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridButton, styles.identityBtn]}
          onPress={() => setIsProfileOpen(true)}
        >
          <Text style={styles.btnEmoji}>🪪</Text>
          <Text style={styles.btnLabel}>KİMLİK</Text>
        </TouchableOpacity>

      </View>

      {/* IDENTITY MODAL */}
      <Modal
        visible={isProfileOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>DEPREM KİMLİK KARTI</Text>
            <TouchableOpacity onPress={() => setIsProfileOpen(false)}>
              <Text style={styles.closeText}>KAPAT</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>

            {/* READ ONLY CARD (IF SAVED) */}
            {isSaved && (
              <View style={styles.idCard}>
                <Text style={styles.idCardTitle}>AFET BİLGİ KARTI</Text>
                <View style={styles.idRow}>
                  <View>
                    <Text style={styles.idLabel}>İSİM SOYİSİM</Text>
                    <Text style={styles.idValue}>{name || "Belirtilmemiş"}</Text>
                  </View>
                  <View>
                    <Text style={styles.idLabel}>KAN GRUBU</Text>
                    <Text style={styles.idValueBig}>{bloodType || "-"}</Text>
                  </View>
                </View>
                <Text style={styles.idLabel}>ACİL DURUM NO</Text>
                <Text style={styles.idValue}>{emergencyPhone || "-"}</Text>

                <Text style={styles.idLabel}>NOTLAR / HASTALIKLAR</Text>
                <Text style={styles.idValue}>{notes || "Yok"}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>{isSaved ? "Bilgileri Düzenle" : "Bilgilerinizi Girin"}</Text>

            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Örn: Ahmet Yılmaz"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Kan Grubu</Text>
            <TextInput
              style={styles.input}
              value={bloodType}
              onChangeText={setBloodType}
              placeholder="Örn: 0 Rh+"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Acil Durum Numarası (Yakını)</Text>
            <TextInput
              style={styles.input}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="0555..."
              keyboardType="phone-pad"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Tıbbi Notlar / Alerjiler</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Diyabet, İlaç Alerjisi vb."
              multiline
              placeholderTextColor="#666"
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveButtonText}>KAYDET</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  mapSection: { flex: 2 },
  map: { ...StyleSheet.absoluteFillObject },

  infoOverlay: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  infoText: { color: '#FFD700', fontWeight: 'bold', textAlign: 'center' },

  gridContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  gridButton: {
    width: '48%',
    height: '45%',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },

  inactiveBtn: { backgroundColor: '#333' },
  activeBtn: { backgroundColor: '#fff' },
  alarmBtn: { backgroundColor: '#FF3B30' },
  scanningBtn: { backgroundColor: '#32ADE6' },
  smsBtn: { backgroundColor: '#34C759' },
  identityBtn: { backgroundColor: '#FF9500', width: '100%', marginTop: 5 },

  btnEmoji: { fontSize: 32, marginBottom: 5 },
  btnLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
  },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#1c1c1e' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  modalBody: { padding: 20 },

  inputLabel: { color: '#888', marginTop: 15, marginBottom: 5, fontSize: 14 },
  input: {
    backgroundColor: '#333',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    marginBottom: 50,
    alignItems: 'center',
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },

  // ID Card Styles
  idCard: {
    backgroundColor: '#FF3B30', // Red Emergency Card
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  idCardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  idLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 },
  idValue: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  idValueBig: { color: 'white', fontSize: 32, fontWeight: 'bold' },
});

export default App;