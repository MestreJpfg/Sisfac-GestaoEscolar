'use client';

import { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const declarationRef = useRef<HTMLDivElement>(null);
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
    if (!declarationRef.current) return;

    const canvas = await html2canvas(declarationRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${nomeCompleto}.pdf`);
    onClose();
  };

  if (!isClient) {
    return null; // Don't render anything on the server or during initial hydration
  }

  return (
    <>
      {/* Hidden Div to render content for PDF generation */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div ref={declarationRef} className="w-[210mm] h-[297mm] bg-white text-black p-0 m-0 relative">
            <img
                src="/declaracao-template.png"
                alt="Declaração de Matrícula"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill'
                }}
            />
            <div className="absolute top-0 left-0 w-full h-full p-[1cm]" style={{ boxSizing: 'border-box' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '30%',
                        left: '1cm',
                        right: '1cm',
                        fontFamily: 'Arial',
                        fontSize: '13pt',
                        lineHeight: '1.5',
                        textAlign: 'justify',
                        textIndent: '1cm',
                    }}
                >
                    Declaro que <strong>{nomeCompleto}</strong>, nascido em {dataNascimento}, é aluno regularmente matriculado nesta Unidade Escolar, no {serie} {turma} {turno}, no ano letivo de {currentYear}.
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: '45%',
                        left: '1cm',
                        right: '1cm',
                        fontFamily: 'Arial',
                        fontSize: '13pt',
                        lineHeight: '1.5',
                    }}
                >
                    Observações:
                </div>
                 <div
                    style={{
                        position: 'absolute',
                        top: '70%',
                        left: '1cm',
                        right: '1cm',
                        fontFamily: 'Arial',
                        fontSize: '13pt',
                        textAlign: 'right',
                    }}
                >
                    Fortaleza, {currentDate}
                </div>
            </div>
        </div>
      </div>
      
      {/* Visible Dialog to inform the user */}
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
