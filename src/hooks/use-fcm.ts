'use client';

import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useMessaging } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// Make sure to create this .env.local file with your VAPID key
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export function useFcm() {
  const messaging = useMessaging();
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'loading'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
       setNotificationPermission('denied');
    }
  }, []);
  
  // Handle incoming foreground messages
  useEffect(() => {
    // This effect will run only on the client where messaging is available
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received.', payload);
        toast({
          title: payload.notification?.title,
          description: payload.notification?.body,
        });
      });
      return () => unsubscribe();
    }
  }, [messaging, toast]);

  const requestPermissionAndGetToken = async () => {
    if (!messaging) {
      console.error('Firebase Messaging is not initialized or not available in this environment.');
      setNotificationPermission('denied');
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VAPID key is missing. Set NEXT_PUBLIC_FCM_VAPID_KEY in your environment variables.');
       toast({
        variant: 'destructive',
        title: 'Erro de Configuração',
        description: 'A chave de segurança para notificações não foi encontrada.',
      });
      return null;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          setFcmToken(currentToken);
          return currentToken;
        } else {
          console.log('No registration token available. Request permission to generate one.');
           toast({
            variant: 'destructive',
            title: 'Token Não Disponível',
            description: 'Não foi possível obter o token para notificações.',
          });
          return null;
        }
      } else {
        console.log('Unable to get permission to notify.');
        toast({
          title: 'Permissão Negada',
          description: 'Você não receberá notificações.',
        });
        return null;
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
       toast({
        variant: 'destructive',
        title: 'Erro ao Obter Token',
        description: 'Ocorreu um erro ao solicitar o token de notificação.',
      });
      return null;
    }
  };

  return { fcmToken, notificationPermission, requestPermissionAndGetToken };
}
