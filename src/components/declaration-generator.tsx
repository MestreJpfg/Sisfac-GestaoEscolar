
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

    const generatePdfContent = () => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);

      // Título
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DECLARAÇÃO', pdfWidth / 2, 90, { align: 'center' });

      // Corpo do texto
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const text = `Declaramos, para os devidos fins, que o(a) aluno(a) ${nomeCompleto}, nascido(a) em ${dataNascimento}, está regularmente matriculado(a) nesta Unidade Escolar no ano letivo de ${currentYear}, cursando o ${serie} - Turma ${turma}, no período da ${turno}.`;

      const leftMargin = 30;
      const rightMargin = 30;
      const textWidth = pdfWidth - leftMargin - rightMargin;
      
      const textLines = pdf.splitTextToSize(text, textWidth); 
      pdf.text(textLines, leftMargin, 110, { align: 'justify', lineHeightFactor: 1.5 });

      const textHeight = pdf.getTextDimensions(textLines).h;

      pdf.text('Por ser verdade, firmamos a presente declaração.', leftMargin, 110 + textHeight + 10, { align: 'justify' });
      
      // Data
      pdf.text(`Fortaleza, ${currentDate}`, pdfWidth - rightMargin, pdfHeight - 80, { align: 'right' });

      // Linha para assinatura
      const signatureLineY = pdfHeight - 60;
      pdf.setLineWidth(0.5);
      pdf.line(pdfWidth / 2 - 40, signatureLineY, pdfWidth / 2 + 40, signatureLineY);
      pdf.setFontSize(10);
      pdf.text('Direção Escolar', pdfWidth / 2, signatureLineY + 5, { align: 'center' });

      pdf.save(`Declaracao_${nomeCompleto.replace(/ /g, '_')}.pdf`);
      onClose();
    };

    img.onload = () => {
      pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'MEDIUM');
      generatePdfContent();
    };

    img.onerror = () => {
        console.error("Erro ao carregar a imagem do template. Gerando PDF sem imagem.");
        generatePdfContent();
    };
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
