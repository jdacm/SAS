import { database } from '../firebaseConfig';
import { ref, set, get, child } from 'firebase/database';

export const linkCardToUser = async (nfcUid, userId, userName) => {
  try {
    await set(ref(database, `cardMappings/${nfcUid}`), {
      userId,
      userName,
      linkedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error linking card:', error);
    return false;
  }
};

export const getUserByCard = async (nfcUid) => {
  try {
    const snapshot = await get(child(ref(database), `cardMappings/${nfcUid}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting user by card:', error);
    return null;
  }
};

export const getUserCards = async (userId) => {
  try {
    const cardsRef = ref(database, 'cardMappings');
    const snapshot = await get(cardsRef);
    const cards = [];
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (data.userId === userId) {
        cards.push({
          nfcUid: childSnapshot.key,
          ...data
        });
      }
    });
    
    return cards;
  } catch (error) {
    console.error('Error getting user cards:', error);
    return [];
  }
};