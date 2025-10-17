
'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { type DataItem } from './data-viewer';

interface DeclarationGeneratorProps {
  student: DataItem;
  onClose: () => void;
}

const DeclarationGenerator = ({ student, onClose }: DeclarationGeneratorProps) => {
  const [currentYear, setCurrentYear] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setCurrentYear(now.getFullYear().toString());
    setCurrentDate(now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  const getStudentValue = (label: string): string => {
    if (!student.subItems) return '';
    const item = student.subItems.find(si => si.label.toLowerCase() === label.toLowerCase());
    return item ? item.value : '';
  };
  
  const nomeCompleto = student.mainItem;
  const dataNascimento = getStudentValue('data nascimento');
  const serie = getStudentValue('serie');
  const turma = getStudentValue('turma');
  const turno = getStudentValue('turno');

  const handleExportToPdf = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const img = new Image();
    img.src = '/declaracao-template.png';
    img.onload = () => {
      pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'MEDIUM');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 0, 0);

      const text1 = `Declaro que ${nomeCompleto}, nascido em ${dataNascimento}, é aluno regularmente matriculado nesta Unidade Escolar, no ${serie} ${turma} ${turno}, no ano letivo de ${currentYear}.`;
      const text2 = 'Por ser verdade, firmo a presente declaração.';
      
      const leftMargin = 25; // 2.5cm
      const rightMargin = 25; // 2.5cm
      const textWidth = pdfWidth - leftMargin - rightMargin;
      
      const splitText1 = pdf.splitTextToSize(text1, textWidth);
      const splitText2 = pdf.splitTextToSize(text2, textWidth);

      const startY = 100;
      pdf.text(splitText1, leftMargin, startY, { align: 'justify', lineHeightFactor: 1.5 });
      
      const heightText1 = pdf.getTextDimensions(splitText1).h;
      pdf.text(splitText2, leftMargin, startY + heightText1 + 10, { align: 'justify' });

      pdf.text(`Fortaleza, ${currentDate}`, pdfWidth - rightMargin, pdfHeight - 80, { align: 'right' });
      
      pdf.save(`${nomeCompleto}.pdf`);
      onClose();
    };
    img.onerror = () => {
        console.error("Erro ao carregar a imagem do template.");
        const fallbackText = `Declaro que ${nomeCompleto}, nascido em ${dataNascimento}, é aluno regularmente matriculado nesta Unidade Escolar, no ${serie} ${turma} ${turno}, no ano letivo de ${currentYear}.`;
        pdf.text(fallbackText, 20, 90, { maxWidth: pdfWidth - 40, align: 'justify' });
        pdf.text(`Fortaleza, ${currentDate}`, pdfWidth - 20, 150, { align: 'right' });
        pdf.save(`${nomeCompleto}.pdf`);
        onClose();
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Declaração</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Clique em "Exportar PDF" para gerar e baixar a declaração para <strong>{nomeCompleto}</strong>.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleExportToPdf}>
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeclarationGenerator;
