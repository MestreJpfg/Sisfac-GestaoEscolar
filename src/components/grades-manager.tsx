
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function GradesManager() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Módulo de Gestão de Notas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <Construction className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Em Desenvolvimento</h3>
                    <p className="mt-2 max-w-md">
                        Esta funcionalidade para lançamento e gestão interativa de notas está a ser construída. Em breve, poderá gerir os boletins diretamente aqui.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
