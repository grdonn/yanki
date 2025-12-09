# [Yankı] - Offline Disaster Relief App 🛟

**[Yankı]** is an advanced, offline-first mobile application designed to save lives when infrastructure fails. It acts as a digital survival kit, maintaining communication and navigation capabilities in post-disaster scenarios without relying on internet or GSM networks.

## About
In the critical hours following a disaster, connectivity is often the first thing to go. **Yankı** ensures you are never truly disconnected from safety. By leveraging local sensors and peer-to-peer technologies, it bridges the gap between victims and rescue teams.

## 🚀 Key Features

*   🗺️ **Smart Offline Map**: Shows nearest safe assembly points using the Haversine algorithm, working independently of online map services.
*   📡 **Bluetooth Mesh Radar**: Scans and detects nearby devices to help locate people under rubble or nearby, even without a cell signal.
*   🔦 **SOS Tools**: Integrated high-intensity Flashlight, a loopable 100dB Whistle/Siren, and an "I'm Safe" SMS generator with precise GPS coordinates.
*   🪪 **Digital ID**: Secure, local encrypted storage for your Blood Type, Emergency Contacts, and Medical Notes to aid first responders.

## 🛠️ Tech Stack

*   **Framework**: React Native CLI
*   **Language**: TypeScript
*   **Connectivity**: React Native Ble PLX
*   **Navigation**: React Native Maps (Google Provider)
*   **Sensors**: React Native Torch, Geolocation, Sound
*   **Storage**: Async Storage (Encrypted Local)

## ⚠️ Disclaimer
"This is a portfolio project demonstrating advanced Native Module capabilities for educational and humanitarian purposes."

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/grdonn/yanki-app.git
    cd yanki-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run on Android**:
    ```bash
    npx react-native run-android
    ```
