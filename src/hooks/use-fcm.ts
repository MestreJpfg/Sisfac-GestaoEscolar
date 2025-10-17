'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useMessaging } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// Make sure to create this .env.local file with your VAPID key
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export function useFcm() {
  const messaging = useMessaging();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'loading'>('loading');

  // Function to check and set the initial notification permission status
  const checkPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied');
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Handle incoming foreground messages
  useEffect(() => {
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

  const registerServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registration successful, scope is:', registration.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  const requestPermissionAndGetToken = async () => {
    if (!messaging) {
      console.error('Firebase Messaging is not initialized. This can happen on the server or if Firebase fails to initialize.');
      toast({
        variant: 'destructive',
        title: 'Erro de Serviço',
        description: 'O serviço de mensagens não está disponível.',
      });
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VAPID key is missing. Please add NEXT_PUBLIC_FCM_VAPID_KEY to your .env file.');
       toast({
        variant: 'destructive',
        title: 'Erro de Configuração',
        description: 'A chave de segurança para notificações (VAPID key) não foi encontrada.',
      });
      return null;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission); // Update state after user action
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token retrieved:', currentToken);
          return currentToken;
        } else {
          console.warn('No registration token available. Request permission to generate one.');
           toast({
            variant: 'destructive',
            title: 'Token Não Disponível',
            description: 'Não foi possível obter o token para notificações. Tente novamente.',
          });
          return null;
        }
      } else {
        console.warn('Notification permission denied.');
        toast({
          title: 'Permissão Negada',
          description: 'Você optou por não receber notificações.',
        });
        return null;
      }
    } catch (err) {
      console.error('An error occurred while retrieving token: ', err);
       toast({
        variant: 'destructive',
        title: 'Erro ao Obter Token',
        description: 'Ocorreu um erro ao solicitar o token de notificação.',
      });
      return null;
    }
  };

  return { notificationPermission, requestPermissionAndGetToken, registerServiceWorker };
}
