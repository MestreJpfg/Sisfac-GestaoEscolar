
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
    const item = student.subItems.find(si => si.label.toLowerCase().includes(label.toLowerCase()));
    return item ? item.value : '';
  };
  
  const nomeCompleto = student.mainItem;
  const dataNascimento = getStudentValue('data nascimento');
  const serie = getStudentValue('serie');
  const turma = getStudentValue('classe');
  const turno = getStudentValue('turno');
  const fileName = `Declaracao_${nomeCompleto.replace(/ /g, '_')}.pdf`;

  const generatePdfInstance = (img: HTMLImageElement): jsPDF => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), undefined, 'FAST');
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);

    const leftMargin = 20;
    const rightMargin = 20;
    const textWidth = pdfWidth - leftMargin - rightMargin;
    let yPosition = 100; 
    
    const text1 = `Declaramos, para os devidos fins, que o(a) aluno(a) ${nomeCompleto}, nascido(a) em ${dataNascimento}, está regularmente matriculado(a) nesta Unidade Escolar no ano letivo de ${currentYear}, cursando o ${serie} - Turma ${turma}, no período da ${turno}.`;
    
    const textLines1 = pdf.splitTextToSize(text1, textWidth);
    pdf.text(textLines1, leftMargin, yPosition, { align: 'left', lineHeightFactor: 1.5 });
    
    yPosition += pdf.getTextDimensions(textLines1, { lineHeightFactor: 1.5 }).h + (4 * 5);

    const obsText = "Obs: Frequência Bimestral em 100%";
    const obsLines = pdf.splitTextToSize(obsText, textWidth);
    pdf.text(obsLines, leftMargin, yPosition, { align: 'left', lineHeightFactor: 1.5 });

    const dateYPosition = 210;
    pdf.text(`Fortaleza, ${currentDate}`, pdf.internal.pageSize.getWidth() - rightMargin, dateYPosition, { align: 'right' });

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
              // Ignore abort errors, which happen if the user cancels the share dialog
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
        console.error("Erro ao carregar a imagem do template. Gerando PDF sem imagem.");
        toast({
          variant: 'destructive',
          title: 'Erro de Imagem',
          description: 'Não foi possível carregar a imagem de fundo do PDF.',
        });
        setIsGenerating(false);
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
