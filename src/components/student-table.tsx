
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "./ui/card";
import { BookUser, Loader2, Search, ArrowUpDown, BookCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export interface SortConfig {
  key: string;
  direction: 'ascending' | 'descending';
}

interface StudentTableProps {
  students: any[];
  isLoading: boolean;
  onRowClick: (student: any) => void;
  onReportCardClick: (student: any) => void;
  hasSearched: boolean;
  onSort: (key: string) => void;
  sortConfig: SortConfig;
}

export default function StudentTable({ students, isLoading, onRowClick, onReportCardClick, hasSearched, onSort, sortConfig }: StudentTableProps) {
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: string, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig.key === sortKey;
    
    return (
        <TableHead className={cn("text-left", className)}>
            <Button variant="ghost" onClick={() => onSort(sortKey)} className="px-2 py-1 h-auto -ml-2">
                {children}
                <ArrowUpDown 
                    className={cn(
                        "ml-2 h-4 w-4 text-muted-foreground/50",
                        isSorted && "text-foreground"
                    )} 
                />
            </Button>
        </TableHead>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">A buscar dados...</p>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
            {hasSearched ? (
                <>
                    <BookUser className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tente um termo de busca diferente ou refine os seus filtros.
                    </p>
                </>
            ) : (
                <>
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Aguardando a sua busca</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                       Utilize a busca por nome ou os filtros avançados para encontrar os alunos.
                    </p>
                </>
            )}
        </CardContent>
      </Card>
    )
  }

  const handleReportCardClick = (e: React.MouseEvent, student: any) => {
    e.stopPropagation();
    onReportCardClick(student);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="nome">Nome</SortableHeader>
                <SortableHeader sortKey="serie" className="text-center">Série</SortableHeader>
                <SortableHeader sortKey="classe" className="text-center">Classe</SortableHeader>
                <SortableHeader sortKey="turno" className="text-center">Turno</SortableHeader>
                <TableHead className="text-center">Boletim</TableHead>
                <SortableHeader sortKey="rm" className="text-center">RM</SortableHeader>
                <SortableHeader sortKey="nee" className="text-center">NEE</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const hasBoletim = student.boletim && Object.keys(student.boletim).length > 0;
                return (
                  <TableRow key={student.id} onClick={() => onRowClick(student)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-left whitespace-nowrap">{student.nome || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{student.serie}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{student.classe}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{student.turno}</TableCell>
                    <TableCell className="text-center">
                       <Button 
                          variant="ghost" 
                          size="icon"
                          disabled={!hasBoletim}
                          onClick={(e) => handleReportCardClick(e, student)}
                          className="h-8 w-8"
                        >
                          <BookCheck className="h-4 w-4" />
                       </Button>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">{student.rm}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {student.nee ? <Badge variant="destructive">SIM</Badge> : <Badge variant="secondary">NÃO</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
