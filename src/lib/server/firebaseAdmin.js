import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT;

const serviceAccount = JSON.parse(firebaseConfig);

serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
}

const db = admin.firestore();

export { admin, db };