
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthError = (error: FirebaseError) => {
    let message = 'An unknown error occurred.';
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'Please enter a valid email address.';
        break;
      case 'auth/user-not-found':
      case 'auth/user-disabled':
      case 'auth/invalid-credential':
        message = 'Incorrect email or password. Please try again.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      default:
        message = error.message;
        break;
    }
    toast({
      variant: 'destructive',
      title: 'Authentication Error',
      description: message,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
    } catch (e) {
      handleAuthError(e as FirebaseError);
    } finally {
      setIsLoading(false);
    }
  };


  return (
     <form onSubmit={handleLogin}>
        <Card className="w-full max-w-[400px]">
            <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
                Access your Social Streamliner dashboard.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                id="login-email"
                type="email"
                placeholder="m@example.com"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                />
            </div>
            </CardContent>
            <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
            </Button>
            </CardFooter>
        </Card>
    </form>
  );
}
