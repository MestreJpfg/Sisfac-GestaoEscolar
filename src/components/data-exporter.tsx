
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { HardDriveDownload, Loader2 } from 'lucide-react';

export default function DataExporter() {
  const [isExporting, setIsExporting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleExport = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'A ligação com a base de dados não foi estabelecida.',
      });
      return;
    }

    setIsExporting(true);
    toast({
      title: 'A iniciar exportação...',
      description: 'A buscar os dados dos alunos. Isto pode demorar alguns instantes.',
    });

    try {
      const q = query(collection(firestore, 'alunos'));
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map((doc) => doc.data());

      if (studentsData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum dado encontrado',
          description: 'Não há alunos na base de dados para exportar.',
        });
        setIsExporting(false);
        return;
      }

      // Flatten the data, especially the 'boletim' object
      const flattenedData = studentsData.map((student) => {
        const flatStudent: { [key: string]: any } = {};

        // Copy all non-object properties first
        for (const key in student) {
          if (typeof student[key] !== 'object' || student[key] === null) {
            flatStudent[key] = student[key];
          } else if (Array.isArray(student[key])) {
             flatStudent[key] = student[key].join(', ');
          }
        }

        // Flatten the 'boletim' object
        if (student.boletim) {
          for (const disciplina in student.boletim) {
            for (const etapa in student.boletim[disciplina]) {
              const header = `boletim_${disciplina}_${etapa}`;
              flatStudent[header] = student.boletim[disciplina][etapa];
            }
          }
        }
        return flatStudent;
      });

      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');

      // Trigger the file download
      XLSX.writeFile(workbook, `Export_Alunos_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Exportação Concluída!',
        description: `${studentsData.length} registos de alunos foram exportados com sucesso.`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: 'Ocorreu um erro ao exportar os dados. Tente novamente.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} variant="secondary" className="flex items-center gap-2 shadow-lg" disabled={isExporting}>
      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
      <span>{isExporting ? 'A exportar...' : 'Exportar para XLSX'}</span>
    </Button>
  );
}
