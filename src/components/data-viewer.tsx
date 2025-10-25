
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Pencil, FileText, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubItem {
  label: string;
  value: string;
}

export interface DataItem {
  id: string;
  mainItem: string;
  subItems: SubItem[];
}

interface DataViewerProps {
  data: DataItem[];
  onEditComplete: (updatedData: DataItem) => void;
  onOpenEdit: (student: DataItem) => void;
  onOpenDeclaration: (student: DataItem) => void;
}

const getSerieFromItem = (item: DataItem): string | undefined => {
  if (!item.subItems || !Array.isArray(item.subItems)) {
    return undefined;
  }
  const serieItem = item.subItems.find(si => si.label.toLowerCase().includes('serie'));
  return serieItem ? serieItem.value : undefined;
}

const getStudentName = (item: DataItem): string => {
  return item.mainItem || 'Aluno sem nome';
}

export default function DataViewer({ data, onEditComplete, onOpenEdit, onOpenDeclaration }: DataViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSerie, setSelectedSerie] = useState<string>("all");

  const series = useMemo(() => {
    const allSeries = data.reduce((acc, item) => {
      const serie = getSerieFromItem(item);
      if (serie) {
        acc.add(serie);
      }
      return acc;
    }, new Set<string>());
    return Array.from(allSeries).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [data]);

  const filteredData = useMemo(() => data.filter((item) => {
    const studentName = getStudentName(item).toLowerCase();
    const matchesSearchTerm = studentName.includes(searchTerm.toLowerCase());
    
    if (selectedSerie === "all") {
      return matchesSearchTerm;
    }
    
    const serie = getSerieFromItem(item);
    return matchesSearchTerm && serie === selectedSerie;
  }), [data, searchTerm, selectedSerie]);

  return (
    <>
      <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-headline text-primary-foreground flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary"/>
                    Alunos Matriculados
                </CardTitle>
                <CardDescription className="mt-1">
                    Total de {filteredData.length} de {data.length} alunos.
                </CardDescription>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Select value={selectedSerie} onValueChange={setSelectedSerie}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por série..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mostrar todas as séries</SelectItem>
                    {series.map(serie => (
                      <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] w-full rounded-md border">
              <Accordion type="single" collapsible className="w-full p-2 sm:p-4">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <AccordionItem value={item.id} key={item.id}>
                      <AccordionTrigger className="hover:bg-accent/50 px-4 rounded-md transition-colors">
                        {getStudentName(item)}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-4 bg-muted/30 rounded-md border">
                            <div className="flex flex-col sm:flex-row justify-end mb-4 gap-2">
                                <Button variant="secondary" size="sm" onClick={() => onOpenDeclaration(item)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Gerar Declaração
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => onOpenEdit(item)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar Aluno
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                              {item.subItems && Array.isArray(item.subItems) ? item.subItems.map((subItem, index) => (
                                <div key={`${subItem.label}-${index}`} className={cn("flex flex-col", subItem.value ? 'opacity-100' : 'opacity-50')}>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate" title={subItem.label}>{subItem.label}</p>
                                  <p className="text-sm text-foreground break-words">{subItem.value || "Não informado"}</p>
                                </div>
                              )) : null}
                            </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
                    <Search className="w-12 h-12 text-muted-foreground/50"/>
                    <p>Nenhum aluno encontrado para os filtros selecionados.</p>
                  </div>
                )}
              </Accordion>
            </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
