'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import AttendanceManager from '@/components/attendance-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceReports from '@/components/attendance-reports';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


export default function AttendancePage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

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

    const canViewReports = useMemo(() => {
        if (!userProfile || !firestore) return false;
        if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') {
            return true;
        }
        // Check for specific permission 'view:attendance' or the managing one 'manage:attendance'
        const hasViewPermission = profileDetails?.permissions?.includes('view:attendance') || userProfile.customPermissions?.includes('view:attendance');
        const hasManagePermission = profileDetails?.permissions?.includes('manage:attendance') || userProfile.customPermissions?.includes('manage:attendance');
        return hasViewPermission || hasManagePermission;
    }, [userProfile, profileDetails, firestore]);
    
    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <CalendarCheck className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Registo de Frequência</h1>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end space-x-4">
                            <nav className="flex items-center space-x-1">
                                <ThemeToggle />
                                <UserNav />
                            </nav>
                        </div>
                    </div>
                </header>

                <main className="flex-1 py-8">
                    <div className="container">
                       <Tabs defaultValue="registro" className="w-full">
                          <TabsList className={`grid w-full ${canViewReports ? 'grid-cols-2' : 'grid-cols-1'} max-w-lg mx-auto`}>
                            <TabsTrigger value="registro">Registo Diário</TabsTrigger>
                            {canViewReports && <TabsTrigger value="relatorios">Relatórios</TabsTrigger>}
                          </TabsList>
                          <TabsContent value="registro" className="mt-6">
                            <AttendanceManager />
                          </TabsContent>
                          {canViewReports && (
                            <TabsContent value="relatorios" className="mt-6">
                                <AttendanceReports />
                            </TabsContent>
                          )}
                        </Tabs>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
