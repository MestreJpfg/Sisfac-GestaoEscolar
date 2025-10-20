
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Pencil, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import EditStudentForm from "./edit-student-form";
import DeclarationGenerator from "./declaration-generator";
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
  onEditComplete: () => void;
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

export default function DataViewer({ data, onEditComplete }: DataViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSerie, setSelectedSerie] = useState<string>("all");
  const [editingStudent, setEditingStudent] = useState<DataItem | null>(null);
  const [declarationStudent, setDeclarationStudent] = useState<DataItem | null>(null);

  const series = useMemo(() => {
    const allSeries = data.reduce((acc, item) => {
      const serie = getSerieFromItem(item);
      if (serie) {
        acc.add(serie);
      }
      return acc;
    }, new Set<string>());
    return Array.from(allSeries).sort();
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

  const handleEditComplete = () => {
    setEditingStudent(null);
    onEditComplete();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Alunos Matriculados</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Select value={selectedSerie} onValueChange={setSelectedSerie}>
                <SelectTrigger>
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
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Informações do Aluno</h3>
            </div>
            <ScrollArea className="h-96 w-full rounded-md border">
              <Accordion type="single" collapsible className="w-full p-4">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <AccordionItem value={item.id} key={item.id}>
                      <AccordionTrigger>{getStudentName(item)}</AccordionTrigger>
                      <AccordionContent>
                        <div className="flex justify-end mb-4 space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setDeclarationStudent(item)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Declaração
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingStudent(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-4 bg-muted/30 rounded-md border">
                          {item.subItems && Array.isArray(item.subItems) ? item.subItems.map((subItem) => (
                            <div key={subItem.label} className={cn("flex flex-col", subItem.value ? 'opacity-100' : 'opacity-50')}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate" title={subItem.label}>{subItem.label}</p>
                              <p className="text-sm text-foreground break-words">{subItem.value || "Não informado"}</p>
                            </div>
                          )) : null}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhum aluno encontrado.
                  </div>
                )}
              </Accordion>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      {editingStudent && (
        <EditStudentForm
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onEditComplete={handleEditComplete}
        />
      )}
      {declarationStudent && (
        <DeclarationGenerator
          student={declarationStudent}
          onClose={() => setDeclarationStudent(null)}
        />
      )}
    </>
  );
}

    