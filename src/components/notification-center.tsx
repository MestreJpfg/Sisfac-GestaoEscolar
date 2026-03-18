
'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Bell, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function NotificationCenter() {
  const { user } = useUser();
  const firestore = useFirestore();

  // 1. Verificar se o utilizador atual é admin para ver notificações
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userDocRef);

  const profileDocRef = useMemoFirebase(() => {
    if (!userProfile?.profileId || !firestore) return null;
    return doc(firestore, 'profiles', userProfile.profileId);
  }, [userProfile, firestore]);
  const { data: profileDetails } = useDoc(profileDocRef);

  const canSeeNotifications = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') return true;
    return profileDetails?.permissions?.['manage:users'] || userProfile.customPermissions?.includes('manage:users');
  }, [userProfile, profileDetails]);

  // 2. Buscar utilizadores que ainda não completaram o perfil (novos)
  const newUsersQuery = useMemo(() => {
    if (!firestore || !canSeeNotifications) return null;
    return query(collection(firestore, 'users'), where('profileCompleted', '==', false));
  }, [firestore, canSeeNotifications]);

  const { data: newUsers, isLoading } = useCollection(newUsersQuery);

  if (!canSeeNotifications || isLoading) return null;

  const count = newUsers?.length || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {count > 0 && <Badge variant="secondary">{count} novos</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className={count > 5 ? "h-72" : ""}>
          {count > 0 ? (
            <DropdownMenuGroup>
              {newUsers?.map((u) => (
                <DropdownMenuItem key={u.id} className="flex flex-col items-start gap-1 p-3 cursor-default">
                  <div className="flex items-center gap-2 font-semibold">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span className="truncate">{u.name || u.email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Registou-se e aguarda configuração de perfil.</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação pendente.
            </div>
          )}
        </ScrollArea>
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <Link href="/dashboard/database" passHref>
              <DropdownMenuItem className="justify-center text-primary font-semibold cursor-pointer">
                Gerir Utilizadores
                <ArrowRight className="ml-2 h-4 w-4" />
              </DropdownMenuItem>
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { ScrollArea } from './ui/scroll-area';
