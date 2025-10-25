
'use client';

import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type DataItem } from './data-viewer';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Label } from './ui/label';

interface ListGeneratorProps {
  allStudents: DataItem[];
  onClose: () => void;
}

const getSerieFromItem = (item: DataItem): string | undefined => {
  if (!item.subItems || !Array.isArray(item.subItems)) {
    return undefined;
  }
  const serieItem = item.subItems.find(si => si.label.toLowerCase().includes('serie'));
  return serieItem ? serieItem.value : undefined;
};

const ListGenerator = ({ allStudents, onClose }: ListGeneratorProps) => {
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const series = useMemo(() => {
    const allSeries = allStudents.reduce((acc, item) => {
      const serie = getSerieFromItem(item);
      if (serie) {
        acc.add(serie);
      }
      return acc;
    }, new Set<string>());
    return Array.from(allSeries).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [allStudents]);

  const generatePdf = () => {
    if (!selectedSerie) {
      toast({
        variant: 'destructive',
        title: 'Série não selecionada',
        description: 'Por favor, escolha uma série para gerar a lista.',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const studentsInSerie = allStudents
        .filter(student => getSerieFromItem(student) === selectedSerie)
        .sort((a, b) => a.mainItem.localeCompare(b.mainItem));

      if (studentsInSerie.length === 0) {
        toast({
          title: 'Nenhum aluno encontrado',
          description: `Não há alunos matriculados na série ${selectedSerie}.`,
        });
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const leftMargin = 15;
      let yPosition = 20;

      // --- Título ---
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(`Lista de Alunos - ${selectedSerie}`, pdfWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Nº', leftMargin, yPosition);
      pdf.text('Nome do Aluno', leftMargin + 10, yPosition);
      yPosition += 5;
      pdf.setLineWidth(0.5);
      pdf.line(leftMargin, yPosition, pdfWidth - leftMargin, yPosition);
      yPosition += 8;


      // --- Lista de Alunos ---
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      
      studentsInSerie.forEach((student, index) => {
        // Verifica se a próxima linha ultrapassará a página
        if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20; // Reseta a posição Y na nova página
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text('Nº', leftMargin, yPosition);
            pdf.text('Nome do Aluno (Continuação)', leftMargin + 10, yPosition);
            yPosition += 5;
            pdf.setLineWidth(0.5);
            pdf.line(leftMargin, yPosition, pdfWidth - leftMargin, yPosition);
            yPosition += 8;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
        }

        const studentName = student.mainItem;
        const studentNumber = index + 1;
        
        pdf.text(`${studentNumber}.`, leftMargin, yPosition, { align: 'left' });
        
        // Adiciona nome do aluno com quebra de linha se necessário
        const splitName = pdf.splitTextToSize(studentName, pdfWidth - leftMargin - 30);
        pdf.text(splitName, leftMargin + 10, yPosition);
        
        yPosition += (splitName.length * 6) + 2; // Incrementa Y baseado no número de linhas do nome
      });

      pdf.save(`Lista_Alunos_${selectedSerie.replace(/ /g, '_')}.pdf`);
      onClose();

    } catch (error) {
      console.error("Erro ao gerar PDF da lista:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível criar a lista. Tente novamente.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Lista de Alunos por Série</DialogTitle>
          <DialogDescription>
            Selecione a série para a qual deseja exportar a lista de alunos em formato PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor='serie-select'>Série</Label>
            <Select value={selectedSerie} onValueChange={setSelectedSerie}>
                <SelectTrigger id="serie-select">
                <SelectValue placeholder="Escolha uma série..." />
                </SelectTrigger>
                <SelectContent>
                {series.map(serie => (
                    <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isGenerating}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={generatePdf} disabled={isGenerating || !selectedSerie}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListGenerator;
