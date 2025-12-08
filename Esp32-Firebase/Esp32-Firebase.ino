#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_NeoPixel.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ===== WiFi & Firebase Config =====
// Create a config.h file with your credentials
// Example config.h:
// #define WIFI_SSID "YourWiFi"
// #define WIFI_PASSWORD "YourPassword"
// #define DATABASE_SECRET "YourDatabaseSecret"
#include "config.h"

#define FIREBASE_URL "https://nfc-attendance-5fb9c-default-rtdb.asia-southeast1.firebasedatabase.app"

// ===== RFID =====
#define SS_PIN 5
#define RST_PIN 22
#define SCK_PIN 18
#define MOSI_PIN 19
#define MISO_PIN 21

// ===== WS2812B LED =====
#define LED_PIN 4
#define LED_COUNT 4

// ===== Buzzer =====
#define BUZZER_PIN 15

Adafruit_NeoPixel led(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
MFRC522 rfid(SS_PIN, RST_PIN);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// ===== Helpers =====
void setColor(uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < LED_COUNT; i++) led.setPixelColor(i, led.Color(r, g, b));
  led.show();
}

void beepSuccess() {
  for (int i = 0; i < 2; i++) {
    tone(BUZZER_PIN, 3000, 80);
    delay(100);
    noTone(BUZZER_PIN);
    delay(50);
  }
}

void beepError() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 800, 150);
    delay(200);
    noTone(BUZZER_PIN);
    delay(100);
  }
}

void beepScanning() {
  tone(BUZZER_PIN, 1500, 50);
  delay(60);
  noTone(BUZZER_PIN);
}

void checkWiFiStatus() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastBlink > 500) {
      ledState = !ledState;
      if (ledState) setColor(255, 100, 0); // Orange
      else setColor(0, 0, 0);
      lastBlink = millis();
    }
    WiFi.reconnect();
  } else {
    setColor(0, 0, 128); // Blue = ready
  }
}

// ===== Get User ID from Card =====
String getUserByCard(String nfcUid) {
  String path = "/cardMappings/" + nfcUid;
  
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson *json = fbdo.jsonObjectPtr();
    FirebaseJsonData data;
    
    if (json->get(data, "userId")) {
      return data.stringValue;
    }
  }
  
  return "";
}

// ===== Record Attendance =====
void recordAttendance(String nfcUid, String userId) {
  // Get timestamp
  unsigned long utcEpochSec = timeClient.getEpochTime();
  unsigned long long timestamp = (unsigned long long)utcEpochSec * 1000;
  
  // Get current date/time for logging
  time_t t = utcEpochSec;
  struct tm *ptm = gmtime(&t);
  char timeStr[30];
  sprintf(timeStr, "%02d/%02d/%04d %02d:%02d:%02d",
          ptm->tm_mday, ptm->tm_mon + 1, ptm->tm_year + 1900,
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
  
  Serial.print("📅 Time: ");
  Serial.println(timeStr);
  
  // Prepare JSON
  FirebaseJson json;
  json.set("nfcUid", nfcUid);
  json.set("userId", userId);
  json.set("timestamp", timestamp);
  json.set("method", "nfc");
  json.set("type", "nfc_checkin");
  
  // Push to Firebase
  if (Firebase.RTDB.pushJSON(&fbdo, "/attendance", &json)) {
    Serial.println("✅ Attendance recorded!");
    
    // Update lastUsed timestamp in card mapping
    FirebaseJson updateJson;
    updateJson.set("lastUsed", timestamp);
    Firebase.RTDB.updateNode(&fbdo, ("/cardMappings/" + nfcUid).c_str(), &updateJson);
    
    setColor(0, 255, 0); // Green = success
    beepSuccess();
  } else {
    Serial.println("❌ Firebase error: " + fbdo.errorReason());
    setColor(255, 0, 0); // Red = error
    beepError();
  }
}

void setup() {
  Serial.begin(115200);
  
  // Initialize SPI for RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  
  // Initialize LED
  led.begin();
  led.show();
  
  // Initialize Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  
  // ===== Wi-Fi Setup =====
  setColor(255, 100, 0); // Orange = connecting
  Serial.println("📡 Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // ===== OTA =====
  ArduinoOTA.setHostname("ESP32-Attendance");
  ArduinoOTA.setPassword("12345678");
  ArduinoOTA.begin();
  Serial.println("✅ OTA Ready");
  
  // ===== Firebase =====
  config.database_url = FIREBASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // ===== NTP =====
  timeClient.begin();
  Serial.println("🕐 Waiting for NTP sync...");
  while (!timeClient.update()) {
    timeClient.forceUpdate();
    delay(500);
  }
  Serial.println("✅ NTP synced!");
  
  // Set to PH time (UTC+8)
  timeClient.setTimeOffset(28800); // 8 hours in seconds
  
  Serial.println("\n🚀 System Ready!");
  Serial.println("👉 Tap an NFC card to record attendance");
  Serial.println("========================================");
  
  setColor(0, 0, 128); // Blue = ready
}

void loop() {
  ArduinoOTA.handle();     // Handle OTA updates
  checkWiFiStatus();       // Check WiFi connection
  timeClient.update();     // Update NTP time
  
  // Check for NFC card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Card detected
  setColor(128, 0, 128); // Purple = reading
  beepScanning();
  
  // Read NFC UID
  String nfcUid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      nfcUid += "0";
    }
    nfcUid += String(rfid.uid.uidByte[i], HEX);
  }
  nfcUid.toUpperCase();
  
  Serial.println("\n🎫 NFC Card Detected!");
  Serial.print("UID: ");
  Serial.println(nfcUid);
  
  // Check if card is registered
  String userId = getUserByCard(nfcUid);
  
  if (userId == "") {
    Serial.println("❌ Card not registered!");
    Serial.println("👉 Register this card in the mobile app first");
    setColor(255, 165, 0); // Orange = not registered
    beepError();
    delay(2000);
    setColor(0, 0, 128); // Blue = ready
    rfid.PICC_HaltA();
    return;
  }
  
  Serial.print("✅ Card registered to user: ");
  Serial.println(userId);
  
  // Record attendance
  recordAttendance(nfcUid, userId);
  
  // Halt PICC
  rfid.PICC_HaltA();
  
  // Return to ready state after delay
  delay(1000);
  setColor(0, 0, 128); // Blue = ready
}