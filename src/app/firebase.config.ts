import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
apiKey: "AIzaSyDvK9O4WL94twhY93SWgxjEDwpKDOCa6A8",
  authDomain: "minha-garagem-c8704.firebaseapp.com",
  projectId: "minha-garagem-c8704",
  storageBucket: "minha-garagem-c8704.firebasestorage.app",
  messagingSenderId: "930848617862",
  appId: "1:930848617862:web:3fbc4a8491b830a60ae807",
  measurementId: "G-5REQZ2BB2N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
