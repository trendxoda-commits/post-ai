'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import {
  getAccessToken,
  exchangeForLongLivedToken,
  getInstagramUserDetails,
} from '@/app/actions';
import { doc, collection, setDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

enum Status {
  PENDING,
  SUCCESS,
  ERROR,
}

export default function InstagramCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false); // Ref to prevent double execution in Strict Mode

  useEffect(() => {
    // Prevent the effect from running twice in development with Strict Mode
    if (process.env.NODE_ENV === 'development' && hasRun.current) {
        return;
    }
    hasRun.current = true;
      
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error_description');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setStatus(Status.ERROR);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: errorParam,
      });
      return;
    }

    // Security check: ensure the state matches the logged-in user's ID.
    if (!user || state !== user.uid) {
      setError('Invalid state parameter. Authentication request mismatch.');
      setStatus(Status.ERROR);
      return;
    }

    if (!code) {
      setError('Authorization code not found in the URL.');
      setStatus(Status.ERROR);
      return;
    }

    const handleTokenExchange = async () => {
      try {
        // 1. Get apiCredentials to find clientId and clientSecret
        const credsRef = collection(firestore, 'users', user.uid, 'apiCredentials');
        const credsSnapshot = await getDocs(credsRef);
        if (credsSnapshot.empty) {
          throw new Error('API Credentials not found for this user.');
        }
        const apiCredential = credsSnapshot.docs[0].data();
        const apiCredentialId = credsSnapshot.docs[0].id;
        
        // Construct the redirect URI - MUST match the one used in the initial auth request
        if (!process.env.NEXT_PUBLIC_URL || !process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI) {
            throw new Error('Application redirect URI is not configured.');
        }
        const redirectUri = `${process.env.NEXT_PUBLIC_URL}${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}`;

        // 2. Exchange code for a short-lived access token
        const { accessToken: shortLivedToken } = await getAccessToken({
          code,
          clientId: apiCredential.appId,
          clientSecret: apiCredential.appSecret,
          redirectUri: redirectUri,
        });

        // 3. Exchange short-lived token for a long-lived one
        const { longLivedToken } = await getLongLivedToken({
          shortLivedToken,
          clientId: apiCredential.appId,
          clientSecret: apiCredential.appSecret,
        });

        // 4. Save the long-lived token to the user's ApiCredential document
        const credDocRef = doc(firestore, 'users', user.uid, 'apiCredentials', apiCredentialId);
        await setDoc(credDocRef, { accessToken: longLivedToken }, { merge: true });

        // 5. Get user's pages and Instagram accounts
        const { accounts } = await getIgUserDetails({
          accessToken: longLivedToken,
        });

        // If no accounts were found, inform the user and stop.
        if (accounts.length === 0) {
            toast({
                title: 'No Accounts Found',
                description: 'We could not find any Facebook Pages or Instagram Business accounts. Please ensure you have granted permissions.',
            });
            setStatus(Status.SUCCESS); // Technically not an error, just nothing to add.
            router.push('/settings');
            return;
        }

        // 6. Save the new accounts to Firestore, checking for duplicates.
        const socialAccountsRef = collection(firestore, 'users', user.uid, 'socialAccounts');
        let newAccountsCount = 0;
        
        for (const account of accounts) {
            // Use instagramId for IG, facebookPageId for FB
            const platformSpecificId = account.platform === 'Instagram' ? account.accountId : account.accountId;
            if (!platformSpecificId) continue;
            
            const q = query(socialAccountsRef, where('accountId', '==', platformSpecificId), where('platform', '==', account.platform));
            const existingAccountSnapshot = await getDocs(q);

            if (existingAccountSnapshot.empty) {
                const newAccountDocRef = doc(socialAccountsRef);
                await setDoc(newAccountDocRef, {
                    id: newAccountDocRef.id,
                    userId: user.uid,
                    platform: account.platform,
                    displayName: account.displayName,
                    accountId: platformSpecificId,
                    pageAccessToken: account.pageAccessToken,
                    avatar: account.avatar || `https://picsum.photos/seed/${platformSpecificId}/40/40`,
                });
                newAccountsCount++;
            } else {
                // Optionally, update the existing account's details if they have changed
                const existingDoc = existingAccountSnapshot.docs[0];
                await setDoc(existingDoc.ref, { 
                    pageAccessToken: account.pageAccessToken, 
                    displayName: account.displayName,
                    avatar: account.avatar || existingDoc.data().avatar,
                }, { merge: true });
            }
        }

        setStatus(Status.SUCCESS);
        
        if (newAccountsCount > 0) {
            toast({
              title: 'Connection Successful!',
              description: `${newAccountsCount} new account(s) have been connected.`,
            });
        } else {
            toast({
              title: 'Accounts Updated',
              description: 'Your existing accounts have been refreshed with the latest information.',
            });
        }
        
        // Redirect back to settings page
        router.push('/settings');

      } catch (err: any) {
        console.error('Error during token exchange:', err);
        setError(err.message || 'An unknown error occurred during authentication.');
        setStatus(Status.ERROR);
        toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: err.message,
        });
      }
    };

    handleTokenExchange();
  }, [searchParams, user, firestore, router, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      {status === Status.PENDING && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h1 className="text-xl font-medium">Connecting your account...</h1>
          <p className="text-muted-foreground">Please wait, this may take a moment. Do not close this window.</p>
        </>
      )}
      {status === Status.SUCCESS && (
        <>
          <h1 className="text-2xl font-bold text-green-600">Success!</h1>
          <p className="text-muted-foreground">Your account has been connected. Redirecting you now...</p>
        </>
      )}
      {status === Status.ERROR && (
        <>
          <h1 className="text-2xl font-bold text-destructive">Connection Failed</h1>
          <p className="text-muted-foreground max-w-md text-center">{error}</p>
          <Button onClick={() => router.push('/settings')}>
            Return to Settings
          </Button>
        </>
      )}
    </div>
  );
}
