
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
  const turma = getStudentValue('classe');
  const turno = getStudentValue('turno');

  const handleExportToPdf = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    const leftMargin = 20;
    const rightMargin = 20;
    const textWidth = pdfWidth - leftMargin - rightMargin;
    const paragraphIndent = 10; // 1cm

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
      
      const text1 = `Declaramos, para os devidos fins, que o(a) aluno(a) ${nomeCompleto}, nascido(a) em ${dataNascimento}, está regularmente matriculado(a) nesta Unidade Escolar no ano letivo de ${currentYear}, cursando o ${serie} - Turma ${turma}, no período da ${turno}.`;
      const text2 = 'Por ser verdade, firmamos a presente declaração.';
      
      const textLines1 = pdf.splitTextToSize(text1, textWidth - paragraphIndent); 
      const textLines2 = pdf.splitTextToSize(text2, textWidth - paragraphIndent); 
      
      let yPosition = 110;

      // Primeiro parágrafo com indentação
      pdf.text(textLines1, leftMargin + paragraphIndent, yPosition, { align: 'left', lineHeightFactor: 1.5 });
      yPosition += pdf.getTextDimensions(textLines1, { lineHeightFactor: 1.5 }).h + 10;

      // Segundo parágrafo com indentação
      pdf.text(textLines2, leftMargin + paragraphIndent, yPosition, { align: 'left', lineHeightFactor: 1.5 });
      
      // Mover data e assinatura para mais perto do final
      const dateYPosition = 180;
      pdf.text(`Fortaleza, ${currentDate}`, leftMargin + textWidth, dateYPosition, { align: 'right' });

      // Linha para assinatura
      const signatureY = dateYPosition + 20;
      pdf.setLineWidth(0.5);
      pdf.line(pdfWidth / 2 - 40, signatureY, pdfWidth / 2 + 40, signatureY);
      pdf.setFontSize(10);
      pdf.text('Direção Escolar', pdfWidth / 2, signatureY + 5, { align: 'center' });

      pdf.save(`Declaracao_${nomeCompleto.replace(/ /g, '_')}.pdf`);
      onClose();
    };

    img.onload = () => {
      pdf.addImage(img, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'MEDIUM');
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
