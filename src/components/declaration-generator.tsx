
'use client';

import { useState, useEffect } from 'react';
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
    const item = student.subItems.find(si => si.label.toLowerCase().includes(label.toLowerCase()));
    return item ? item.value : '';
  };
  
  const nomeCompleto = student.mainItem;
  const dataNascimento = getStudentValue('data nascimento');
  const serie = getStudentValue('serie');
  const turma = getStudentValue('classe');
  const turno = getStudentValue('turno');

  const generateAndProcessPdf = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const fileName = `Declaracao_${nomeCompleto.replace(/ /g, '_')}.pdf`;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = '/declaracao-template.png';

    const generatePdfContent = () => {
      pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight());
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);

      let yPosition = 95;
      const text1 = `Declaramos, para os devidos fins, que o(a) aluno(a) ${nomeCompleto}, nascido(a) em ${dataNascimento}, está regularmente matriculado(a) nesta Unidade Escolar no ano letivo de ${currentYear}, cursando o ${serie} - Turma ${turma}, no período da ${turno}.`;
      
      const leftMargin = 25;
      const rightMargin = 20;
      const textWidth = pdfWidth - leftMargin - rightMargin;
      
      const textLines1 = pdf.splitTextToSize(text1, textWidth);
      pdf.text(textLines1, leftMargin, yPosition, { align: 'left', lineHeightFactor: 1.5 });
      
      yPosition += pdf.getTextDimensions(textLines1, { lineHeightFactor: 1.5 }).h + 10;
      
      const text2 = "Por ser verdade, firmamos a presente declaração.";
      const textLines2 = pdf.splitTextToSize(text2, textWidth);
      pdf.text(textLines2, leftMargin, yPosition, { align: 'left', lineHeightFactor: 1.5 });
      
      const dateYPosition = 250;
      pdf.text(`Fortaleza, ${currentDate}`, pdfWidth / 2, dateYPosition, { align: 'center' });

      const signatureYPosition = dateYPosition + 20;
      pdf.line(pdfWidth / 2 - 50, signatureYPosition, pdfWidth / 2 + 50, signatureYPosition);
      pdf.text("Direção Escolar", pdfWidth / 2, signatureYPosition + 5, { align: 'center' });

      pdf.save(fileName);
      onClose();
    };

    if (img.complete) {
      generatePdfContent();
    } else {
      img.onload = generatePdfContent;
      img.onerror = () => {
        console.error("Erro ao carregar a imagem do template. Gerando PDF sem imagem.");
        // Call generatePdfContent anyway to create the PDF without the image
        generatePdfContent(); 
      };
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
            <DialogDescription>
              Clique em "Exportar PDF" para gerar e baixar a declaração para {nomeCompleto}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
                </Button>
            </DialogClose>
            <Button type="button" onClick={generateAndProcessPdf}>
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeclarationGenerator;
