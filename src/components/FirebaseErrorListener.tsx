'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It shows a toast with the error message.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error.message, error.request);
      
      let friendlyMessage = "You don't have permission to perform this action.";
      
      // Example of providing more specific feedback based on the operation
      if (error.request.method === 'create') {
        friendlyMessage = "You are not allowed to create this item.";
      } else if (error.request.method === 'update') {
        friendlyMessage = "You are not allowed to update this item.";
      } else if (error.request.method === 'delete') {
        friendlyMessage = "You are not allowed to delete this item.";
      } else if (error.request.method === 'list') {
         friendlyMessage = "You do not have permission to view this list.";
      } else if (error.request.method === 'get') {
         friendlyMessage = "You do not have permission to view this item.";
      }

      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: friendlyMessage,
      });

    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component renders nothing.
  return null;
}
