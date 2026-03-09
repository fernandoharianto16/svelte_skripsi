import admin from 'firebase-admin';
import serviceAccount from '../../../serviceAccountKey.cjs';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

export { admin, db };