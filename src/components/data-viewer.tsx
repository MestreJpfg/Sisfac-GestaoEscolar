"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileDown } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export interface DataItem {
  mainItem: string;
  subItems: { label: string; value: string }[];
  allColumns: string[];
}

interface DataViewerProps {
  data: DataItem[];
  columnHeaders: string[];
}

export default function DataViewer({ data, columnHeaders }: DataViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredData = data.filter((item) =>
    item.mainItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportToPdf = (item: DataItem) => {
    const exportContentId = `export-content-${item.mainItem.replace(/\s+/g, '-')}`;

    const contentToExport = document.createElement('div');
    contentToExport.id = exportContentId;
    contentToExport.className = "p-4 bg-background text-foreground";
    contentToExport.style.width = '210mm'; // A4 width
    contentToExport.style.position = 'absolute';
    contentToExport.style.left = '-9999px';
    
    let innerHTML = `<h1 class="text-2xl font-bold mb-4 text-primary">${item.mainItem}</h1><ul class="list-none p-0">`;
    item.subItems.forEach(sub => {
        innerHTML += `<li class="mb-2 text-base"><strong class="font-semibold text-muted-foreground">${sub.label}:</strong><span class="ml-2">${sub.value}</span></li>`;
    });
    innerHTML += '</ul>';
    contentToExport.innerHTML = innerHTML;
    
    document.body.appendChild(contentToExport);

    html2canvas(contentToExport, { 
      scale: 2,
      useCORS: true, 
      backgroundColor: 'hsl(var(--background))'
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      const widthInPdf = pdfWidth - 20; // A4 with margin
      const heightInPdf = widthInPdf / ratio;
      
      let finalHeight = heightInPdf;
      if(heightInPdf > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
      }

      pdf.addImage(imgData, 'PNG', 10, 10, widthInPdf, finalHeight);
      pdf.save(`${item.mainItem}.pdf`);
      
      document.body.removeChild(contentToExport);

      toast({
        title: "Exportado com Sucesso",
        description: `Os dados de ${item.mainItem} foram exportados para PDF.`,
      });

    }).catch(err => {
        console.error("Could not generate PDF", err);
        toast({
            variant: "destructive",
            title: "Erro na Exportação",
            description: "Não foi possível exportar os dados para PDF.",
        });
        document.body.removeChild(contentToExport);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Dados Extraídos</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Visualização dos Dados</h3>
          <ScrollArea className="h-96 w-full rounded-md border">
            <Accordion type="single" collapsible className="w-full p-4">
              {filteredData.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>{item.mainItem}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="icon" onClick={() => handleExportToPdf(item)} title="Exportar para PDF">
                            <FileDown className="h-5 w-5" />
                        </Button>
                    </div>
                    <ul className="space-y-2 pl-4">
                      {item.subItems.map((sub, subIndex) => (
                        <li key={subIndex} className="text-sm">
                          <span className="font-semibold text-muted-foreground">{sub.label}:</span>
                          <span className="ml-2 text-foreground">{sub.value}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}