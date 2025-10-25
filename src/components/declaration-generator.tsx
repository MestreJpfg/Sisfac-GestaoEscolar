
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DeclarationGeneratorProps {
  student: DataItem;
  onClose: () => void;
}

const DeclarationGenerator = ({ student, onClose }: DeclarationGeneratorProps) => {
  const [currentYear, setCurrentYear] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setCurrentYear(now.getFullYear().toString());
    setCurrentDate(now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  const getStudentValue = (label: string): string => {
    if (!student.subItems) return '';
    // Case-insensitive and trim search for the label
    const item = student.subItems.find(si => si.label.trim().toLowerCase() === label.trim().toLowerCase());
    return item ? item.value : '';
  };
  
  const nomeCompleto = student.mainItem;
  const dataNascimento = getStudentValue('data nascimento');
  const serie = getStudentValue('serie');
  const turma = getStudentValue('classe');
  const turno = getStudentValue('turno');
  const mae = getStudentValue('filiacao1');
  const pai = getStudentValue('filiação 2'); // Note the different character in 'filiação'
  const rm = getStudentValue('rm');
  const nis = getStudentValue('nis');
  const fileName = `Declaracao_${nomeCompleto.replace(/ /g, '_')}.pdf`;

  const generatePdfInstance = (img: HTMLImageElement): jsPDF => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), undefined, 'FAST');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);

    const leftMargin = 25;
    const rightMargin = 25;
    const textWidth = pdfWidth - leftMargin - rightMargin;
    let yPosition = 100;

    // --- Title ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text("DECLARAÇÃO DE MATRÍCULA", pdfWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // --- Body Text ---
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    const addParagraph = (text: (string | { text: string; isBold: boolean })[]) => {
        const splitText = pdf.splitTextToSize(text.map(t => typeof t === 'string' ? t : t.text).join(''), textWidth);
        const boldParts = text.filter(t => typeof t !== 'string' && t.isBold) as { text: string; isBold: boolean }[];
        
        pdf.text(splitText, leftMargin, yPosition, { align: 'justify', lineHeightFactor: 1.5 });
        
        // Find and re-apply bolding
        splitText.forEach((line: string, lineIndex: number) => {
            boldParts.forEach(boldPart => {
                let startIndex = 0;
                let index = line.indexOf(boldPart.text, startIndex);
                while(index !== -1) {
                    const precedingText = line.substring(0, index);
                    const precedingTextWidth = pdf.getStringUnitWidth(precedingText) * pdf.getFontSize() / pdf.internal.scaleFactor;
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(boldPart.text, leftMargin + precedingTextWidth, yPosition + (lineIndex * (pdf.getLineHeight() * 1.5 / pdf.internal.scaleFactor)), { align: 'left' });
                    pdf.setFont('helvetica', 'normal');
                    startIndex = index + boldPart.text.length;
                    index = line.indexOf(boldPart.text, startIndex);
                }
            });
        });
        
        yPosition += (splitText.length * (pdf.getLineHeight() * 1.5 / pdf.internal.scaleFactor)) + 5;
    };
    
    const introText = [
        "Declaramos, para os devidos fins, que o(a) estudante ",
        { text: nomeCompleto, isBold: true },
        `, nascido(a) em ${dataNascimento}, filho(a) de ${mae}`,
        pai ? ` e de ${pai},` : ',',
        ` encontra-se regularmente matriculado(a) nesta Unidade Escolar no ano letivo de ${currentYear}.`
    ];
    addParagraph(introText);
    
    const classInfoText = [
        "O(A) referido(a) aluno(a) está cursando o ",
        { text: serie, isBold: true },
        `, na turma `,
        { text: turma, isBold: true },
        `, no período da `,
        { text: turno.toLowerCase(), isBold: true },
        `.`
    ];
    addParagraph(classInfoText);

    // --- Observations Section ---
    if (rm || nis) {
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text("Observações:", leftMargin, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        
        if (rm) {
            pdf.text(`• Registro de Matrícula (RM): ${rm}`, leftMargin + 5, yPosition);
            yPosition += 6;
        }
        if (nis) {
            pdf.text(`• Número de Identificação Social (NIS): ${nis}`, leftMargin + 5, yPosition);
            yPosition += 6;
        }
    }

    // --- Date and Signature ---
    const dateYPosition = 230;
    const signatureYPosition = 250;
    
    pdf.text(`Fortaleza, ${currentDate}.`, pdfWidth / 2, dateYPosition, { align: 'center' });

    pdf.line(pdfWidth / 2 - 40, signatureYPosition, pdfWidth / 2 + 40, signatureYPosition);
    pdf.setFontSize(10);
    pdf.text("Assinatura da Secretaria", pdfWidth / 2, signatureYPosition + 5, { align: 'center' });


    return pdf;
  }

  const handleGeneration = (share: boolean) => {
    setIsGenerating(true);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = '/declaracao-template.png';

    const processPdf = async () => {
      try {
        const pdf = generatePdfInstance(img);
        if (share) {
          const pdfBlob = pdf.output('blob');
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: `Declaração - ${nomeCompleto}`,
            }).catch((error) => {
              if (error.name !== 'AbortError') {
                throw error;
              }
            });
          } else {
             toast({
              variant: 'destructive',
              title: 'Não é possível compartilhar',
              description: 'Seu navegador não suporta o compartilhamento de arquivos. Tente baixar o arquivo.',
            });
          }
        } else {
          pdf.save(fileName);
        }
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({
          variant: 'destructive',
          title: 'Erro ao gerar PDF',
          description: 'Não foi possível criar o documento. Tente novamente.',
        });
      } finally {
        setIsGenerating(false);
        onClose();
      }
    };

    if (img.complete) {
      processPdf();
    } else {
      img.onload = processPdf;
      img.onerror = () => {
        console.error("Erro ao carregar a imagem do template. Gerando PDF sem imagem de fundo.");
        toast({
          variant: 'destructive',
          title: 'Erro de Imagem',
          description: 'Não foi possível carregar a imagem de fundo do PDF. O documento será gerado sem ela.',
        });
        // Generate without the background image if it fails to load
        processPdf();
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
              Escolha uma opção para a declaração de {nomeCompleto}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isGenerating}>
                 {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancelar
                </Button>
            </DialogClose>
            {navigator.share && <Button type="button" onClick={() => handleGeneration(true)} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Compartilhar
            </Button>}
            <Button type="button" onClick={() => handleGeneration(false)} disabled={isGenerating}>
             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeclarationGenerator;
