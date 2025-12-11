// Esp32-Firebase-NFC-Attendance-Demo.ino - FIXED PH TIME
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <SPI.h>
#include <MFRC522.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ===== WiFi Configuration =====
#define WIFI_SSID "CozyHome"
#define WIFI_PASSWORD "VintageHome@25"

// ===== Firebase Configuration =====
#define FIREBASE_URL "https://nfc-attendance-5fb9c-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_API_KEY "AIzaSyAsfWcy9LnoanBFhtjuJR_TlTHFMBsJDJk"
#define FIREBASE_DATABASE_SECRET "zvtsQ4tfIy5W4n6SEN9DCjuOoHrgOaDRoSgk1Ue"

// ===== Demo Cards Configuration =====
#define REGISTERED_CARD_UID "32F69920"
#define DEMO_UNREGISTERED_CARD_UID "32A67B20"

// ===== RFID Configuration =====
#define SS_PIN 5
#define RST_PIN 17
#define SCK_PIN 18
#define MOSI_PIN 23
#define MISO_PIN 19

// ===== LED & Buzzer =====
#define LED_PIN 4
#define BUZZER_PIN 15

// ===== Global Objects =====
MFRC522 rfid(SS_PIN, RST_PIN);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// ===== State Variables =====
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN = 3000;
String lastScannedUID = "";

// ===== Function Prototypes =====
void setupWiFi();
void setupFirebase();
void setupNTP();
void setupRFID();
void beepSuccess();
void beepError();
void beepScan();
void blinkLED(int times, int delayTime);
String getPHTimeString();
unsigned long long getPHTimestampMillis();
String bytesToHex(byte *bytes, byte length);
void checkCardRegistration(String uid);
void recordAttendance(String uid, String cardType, String userName, String userId);
void handleDemoCard(String uid);
void logToSerial(String message, String type = "INFO");

// ===== Philippines Time Functions =====
String getPHTimeString() {
  // Get UTC time
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  
  // Add 8 hours for Philippines Time (UTC+8)
  unsigned long phTime = epochTime + (8 * 3600);
  
  // Convert to struct tm
  struct tm *ptm = gmtime((time_t *)&phTime);
  
  char buffer[30];
  sprintf(buffer, "%04d-%02d-%02d %02d:%02d:%02d",
          ptm->tm_year + 1900, ptm->tm_mon + 1, ptm->tm_mday,
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
  
  return String(buffer);
}

unsigned long long getPHTimestampMillis() {
  // Get UTC time
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  
  // Add 8 hours for Philippines Time (UTC+8) in seconds
  unsigned long phTimeSeconds = epochTime + (8 * 3600);
  
  // Get milliseconds since boot
  unsigned long currentMillis = millis();
  unsigned long millisPortion = currentMillis % 1000;
  
  // Combine: PH time in seconds * 1000 + milliseconds portion
  unsigned long long phTimestampMillis = ((unsigned long long)phTimeSeconds * 1000ULL) + millisPortion;
  
  // Debug output
  struct tm *ptm = gmtime((time_t *)&phTimeSeconds);
  logToSerial("PH Time: " + String(ptm->tm_hour) + ":" + String(ptm->tm_min) + 
              ":" + String(ptm->tm_sec) + " (UTC+8)", "TIME");
  
  return phTimestampMillis;
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔══════════════════════════════════════╗");
  Serial.println("║     NFC ATTENDANCE DEMO SYSTEM      ║");
  Serial.println("║     ESP32 + Firebase + React Native ║");
  Serial.println("╚══════════════════════════════════════╝");
  
  // Initialize components
  setupWiFi();
  setupNTP();  
  setupFirebase();
  setupRFID();
  
  // Initialize LED and Buzzer
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Display current PH time
  String currentPHTime = getPHTimeString();
  logToSerial("Current PH Time: " + currentPHTime, "TIME");
  
  Serial.println("\n🎉 SYSTEM READY FOR DEMO!");
  Serial.println("══════════════════════════════════════════");
}

// ===== Setup WiFi =====
void setupWiFi() {
  logToSerial("Connecting to WiFi...", "WIFI");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    blinkLED(1, 100);
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    logToSerial("WiFi Connected! IP: " + WiFi.localIP().toString(), "SUCCESS");
    digitalWrite(LED_PIN, LOW);
  } else {
    logToSerial("WiFi Connection Failed", "ERROR");
    while (1) {
      blinkLED(3, 200);
      delay(1000);
    }
  }
}

// ===== Setup NTP =====
void setupNTP() {
  logToSerial("Initializing NTP client...", "TIME");
  
  timeClient.begin();
  
  // Try multiple times to get time
  int attempts = 0;
  bool timeSynced = false;
  
  while (attempts < 10) {
    logToSerial("Attempting NTP sync " + String(attempts + 1) + "...", "TIME");
    
    if (timeClient.update()) {
      timeSynced = true;
      break;
    }
    
    delay(1000);
    attempts++;
  }
  
  if (timeSynced) {
    String utcTime = timeClient.getFormattedTime();
    logToSerial("UTC Time from NTP: " + utcTime, "SUCCESS");
    
    // Show Philippines time
    String phTime = getPHTimeString();
    logToSerial("Philippines Time (UTC+8): " + phTime, "SUCCESS");
  } else {
    logToSerial("NTP sync failed! Using system time", "WARNING");
  }
}

// ===== Setup Firebase =====
void setupFirebase() {
  logToSerial("Initializing Firebase...", "FIREBASE");
  
  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_URL;
  config.signer.tokens.legacy_token = FIREBASE_DATABASE_SECRET;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  delay(2000);
  
  if (Firebase.ready()) {
    logToSerial("Firebase Ready!", "SUCCESS");
  } else {
    logToSerial("Firebase initialization failed: " + String(fbdo.errorReason()), "ERROR");
  }
}

// ===== Setup RFID =====
void setupRFID() {
  logToSerial("Initializing RFID Reader...", "RFID");
  
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  delay(100);
  
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  
  if (version == 0x00 || version == 0xFF) {
    logToSerial("RFID Reader not found!", "ERROR");
    while (1) {
      blinkLED(2, 200);
      delay(1000);
    }
  } else {
    logToSerial("RFID Reader Ready! Version: 0x" + String(version, HEX), "SUCCESS");
  }
}

// ===== Main Loop =====
void loop() {
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    logToSerial("WiFi disconnected, reconnecting...", "WARNING");
    WiFi.reconnect();
    delay(2000);
    return;
  }
  
  // Check for new card
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }
  
  if (!rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }
  
  // Check cooldown
  if (millis() - lastScanTime < SCAN_COOLDOWN) {
    logToSerial("Please wait before scanning again", "WARNING");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  // Process the card
  String uid = bytesToHex(rfid.uid.uidByte, rfid.uid.size);
  
  if (uid == lastScannedUID) {
    logToSerial("Same card scanned, ignoring...", "WARNING");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  lastScannedUID = uid;
  lastScanTime = millis();
  
  Serial.println("\n══════════════════════════════════════════");
  logToSerial("NFC CARD DETECTED", "SCAN");
  Serial.print("📟 UID: "); Serial.println(uid);
  
  beepScan();
  digitalWrite(LED_PIN, HIGH);
  
  // Get current PHILIPPINES timestamp
  unsigned long long phTimestamp = getPHTimestampMillis();
  String phDateTime = getPHTimeString();
  
  logToSerial("PH Timestamp: " + String(phTimestamp), "TIME");
  logToSerial("PH Date/Time: " + phDateTime, "TIME");
  
  if (uid == DEMO_UNREGISTERED_CARD_UID) {
    handleDemoCard(uid);
  } else {
    checkCardRegistration(uid);
  }
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("👉 Ready for next card");
  Serial.println("══════════════════════════════════════════");
  
  delay(100);
}

// ===== Helper Functions =====
void logToSerial(String message, String type) {
  String prefix;
  if (type == "ERROR") prefix = "❌ ";
  else if (type == "SUCCESS") prefix = "✅ ";
  else if (type == "WARNING") prefix = "⚠️ ";
  else if (type == "INFO") prefix = "ℹ️ ";
  else if (type == "TIME") prefix = "🕐 ";
  else if (type == "SCAN") prefix = "🎫 ";
  else prefix = "   ";
  
  Serial.println(prefix + message);
}

void beepSuccess() {
  tone(BUZZER_PIN, 3000, 100);
  delay(120);
  tone(BUZZER_PIN, 3000, 100);
  delay(120);
  tone(BUZZER_PIN, 3000, 100);
  delay(120);
  noTone(BUZZER_PIN);
}

void beepError() {
  tone(BUZZER_PIN, 800, 200);
  delay(250);
  tone(BUZZER_PIN, 600, 200);
  delay(250);
  tone(BUZZER_PIN, 400, 200);
  delay(250);
  noTone(BUZZER_PIN);
}

void beepScan() {
  tone(BUZZER_PIN, 1500, 50);
  delay(60);
  noTone(BUZZER_PIN);
}

void blinkLED(int times, int delayTime) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayTime);
    digitalWrite(LED_PIN, LOW);
    delay(delayTime);
  }
}

String bytesToHex(byte *bytes, byte length) {
  String hexString = "";
  for (byte i = 0; i < length; i++) {
    if (bytes[i] < 0x10) hexString += "0";
    hexString += String(bytes[i], HEX);
  }
  hexString.toUpperCase();
  return hexString;
}

// ===== Handle Demo Card =====
void handleDemoCard(String uid) {
  Serial.println("\n🎭 DEMO CARD DETECTED!");
  
  unsigned long long timestamp = getPHTimestampMillis();
  String dateTime = getPHTimeString();
  
  FirebaseJson demoLog;
  demoLog.set("uid", uid);
  demoLog.set("timestamp", timestamp);
  demoLog.set("dateTime", dateTime);
  demoLog.set("type", "demo_unregistered");
  
  String logPath = "/demoLogs/unregistered_" + String(timestamp);
  Firebase.RTDB.setJSON(&fbdo, logPath.c_str(), &demoLog);
  
  beepError();
  blinkLED(3, 200);
}

// ===== Card Registration Check =====
void checkCardRegistration(String uid) {
  logToSerial("Checking card registration...", "INFO");
  
  if (uid == REGISTERED_CARD_UID) {
    Serial.println("\n🎉 YOUR REGISTERED CARD!");
    recordAttendance(uid, "physical", "Jv Belingon", "t6Np2mfXmwM7f47MnRk1y7XQS3G3");
    return;
  }
  
  String path = "/physicalCards/" + uid;
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    if (fbdo.dataType() == "json") {
      FirebaseJson *json = fbdo.jsonObjectPtr();
      FirebaseJsonData userIdData, userNameData;
      
      if (json->get(userIdData, "userId") && json->get(userNameData, "userName")) {
        String userId = userIdData.stringValue;
        String userName = userNameData.stringValue;
        
        recordAttendance(uid, "physical", userName, userId);
        return;
      }
    }
  }
  
  path = "/virtualCards/" + uid;
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    if (fbdo.dataType() == "json") {
      FirebaseJson *json = fbdo.jsonObjectPtr();
      FirebaseJsonData userIdData, userNameData;
      
      if (json->get(userIdData, "userId") && json->get(userNameData, "userName")) {
        String userId = userIdData.stringValue;
        String userName = userNameData.stringValue;
        
        recordAttendance(uid, "virtual", userName, userId);
        return;
      }
    }
  }
  
  logToSerial("Card not registered in system", "ERROR");
  
  unsigned long long timestamp = getPHTimestampMillis();
  FirebaseJson json;
  json.set("uid", uid);
  json.set("timestamp", timestamp);
  json.set("dateTime", getPHTimeString());
  json.set("status", "unregistered");
  
  String scanPath = "/unregisteredScans/" + String(timestamp);
  Firebase.RTDB.setJSON(&fbdo, scanPath.c_str(), &json);
  
  beepError();
  blinkLED(3, 200);
}

// ===== Record Attendance =====
void recordAttendance(String uid, String cardType, String userName, String userId) {
  logToSerial("Recording attendance...", "INFO");
  
  // Get PHILIPPINES timestamp
  unsigned long long timestamp = getPHTimestampMillis();
  String dateTime = getPHTimeString();
  
  // Show what time is being recorded
  logToSerial("Recording PH Time: " + dateTime, "TIME");
  
  // Create attendance record
  FirebaseJson attendance;
  attendance.set("uid", uid);
  attendance.set("userId", userId);
  attendance.set("userName", userName);
  attendance.set("timestamp", (double)timestamp);
  attendance.set("dateTime", dateTime);
  attendance.set("cardType", cardType);
  attendance.set("device", "ESP32-NFC-Reader");
  attendance.set("location", "Demo Classroom");
  attendance.set("status", "checked_in");
  attendance.set("isDemo", (uid == REGISTERED_CARD_UID) ? "true" : "false");
  attendance.set("timezone", "UTC+8");  // Add timezone info
  
  // Generate unique key
  String recordKey = "attendance_" + String(timestamp) + "_" + String(random(1000, 9999));
  String path = "/attendance/" + recordKey;
  
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &attendance)) {
    Serial.println("\n✅ ATTENDANCE RECORDED SUCCESSFULLY!");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("📁 Record ID: "); Serial.println(recordKey);
    Serial.print("👤 User: "); Serial.println(userName);
    Serial.print("💳 Card Type: "); Serial.println(cardType);
    Serial.print("🕐 PH Time: "); Serial.println(dateTime);
    Serial.print("⏱️ Timestamp (ms): "); Serial.println(timestamp);
    Serial.print("📍 Location: "); Serial.println("Demo Classroom");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    beepSuccess();
    blinkLED(2, 100);
  } else {
    logToSerial("Failed to record: " + String(fbdo.errorReason()), "ERROR");
    beepError();
    blinkLED(5, 100);
  }
}