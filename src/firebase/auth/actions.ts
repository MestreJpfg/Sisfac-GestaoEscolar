'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';

// Esta ação do servidor cria uma entrada de utilizador na coleção Firestore
// após a sua criação bem-sucedida no Firebase Auth.
export async function createUserInFirestore(
  uid: string,
  email: string,
  displayName: string,
  role: string
) {
  await initializeAdminApp();
  const firestore = getFirestore();
  const userRef = firestore.collection('users').doc(uid);

  let finalRole = role;
  if (email.toLowerCase() === 'mestrejp@gmail.com') {
      finalRole = 'Admin';
  }

  await userRef.set({
    uid,
    email,
    displayName,
    role: finalRole,
    createdAt: new Date(),
  });
}
