// initDatabase.js - Run once to initialize database
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nfc-attendance-5fb9c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function initDatabase() {
  console.log("Initializing database structure...");
  
  // Create sample user
  await db.ref('users/user123').set({
    email: 'john@example.com',
    displayName: 'John Doe',
    createdAt: Date.now()
  });
  
  // Create sample physical card
  await db.ref('physicalCards/12345678').set({
    userId: 'user123',
    userName: 'John Doe',
    linkedAt: Date.now(),
    isActive: true,
    type: 'physical',
    name: 'Student ID Card'
  });
  
  // Create linked virtual card
  await db.ref('virtualCards/V-USER-ABC123').set({
    userId: 'user123',
    userName: 'John Doe',
    physicalCardId: '12345678',
    linkedAt: Date.now(),
    isActive: true,
    type: 'virtual',
    name: 'Phone Virtual NFC'
  });
  
  // Add to user's card list
  await db.ref('userCards/user123_physical').set({
    userId: 'user123',
    cardId: '12345678',
    cardType: 'physical',
    linkedAt: Date.now(),
    name: 'Student ID Card'
  });
  
  await db.ref('userCards/user123_virtual').set({
    userId: 'user123',
    cardId: 'V-USER-ABC123',
    cardType: 'virtual',
    physicalCardId: '12345678',
    linkedAt: Date.now(),
    name: 'Phone Virtual NFC'
  });
  
  console.log("✅ Database initialized!");
  console.log("Physical Card: 12345678");
  console.log("Virtual Card: V-USER-ABC123");
  console.log("Both linked to user123 (John Doe)");
  
  process.exit(0);
}

initDatabase().catch(console.error);