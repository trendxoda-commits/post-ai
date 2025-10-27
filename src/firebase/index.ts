'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export const addDocumentNonBlocking = (ref: any, data: any) => {
    return addDoc(ref, data)
        .catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ref.path,
                operation: 'create',
                requestResourceData: data,
            }));
            throw err;
        });
}

export const setDocumentNonBlocking = (ref: any, data: any, options: any) => {
    return setDoc(ref, data, options)
        .catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ref.path,
                operation: options.merge ? 'update' : 'create',
                requestResourceData: data,
            }));
            throw err;
        });
}

export const updateDocumentNonBlocking = (ref: any, data: any) => {
    return updateDoc(ref, data)
        .catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ref.path,
                operation: 'update',
                requestResourceData: data,
            }));
            throw err;
        });
}


export const deleteDocumentNonBlocking = (ref: any) => {
    return deleteDoc(ref)
        .catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: ref.path,
                operation: 'delete',
            }));
            throw err;
        });
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
