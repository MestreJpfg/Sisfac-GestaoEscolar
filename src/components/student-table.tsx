"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "./ui/card";
import { BookUser, ArrowUpDown, BookCheck, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export interface SortConfig {
  key: string;
  direction: 'ascending' | 'descending';
}

interface StudentTableProps {
  students: any[];
  onRowClick: (student: any) => void;
  onReportCardClick: (student: any) => void;
  onSort: (key: string) => void;
  sortConfig: SortConfig;
}

export default function StudentTable({ students, onRowClick, onReportCardClick, onSort, sortConfig }: StudentTableProps) {
  
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

  if (students.length === 0) {
    return (
       <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
            <BookUser className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Tente um termo de busca diferente ou refine os seus filtros.
            </p>
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
                <SortableHeader sortKey="serie" className="hidden sm:table-cell text-center">Série</SortableHeader>
                <SortableHeader sortKey="classe" className="hidden md:table-cell text-center">Classe</SortableHeader>
                <SortableHeader sortKey="turno" className="hidden lg:table-cell text-center">Turno</SortableHeader>
                <TableHead className="text-center">Boletim</TableHead>
                <SortableHeader sortKey="rm" className="hidden lg:table-cell text-center">RM</SortableHeader>
                <SortableHeader sortKey="nee" className="text-center">NEE</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const hasBoletim = student.boletim && Object.keys(student.boletim).length > 0;
                return (
                  <TableRow key={student.id} onClick={() => onRowClick(student)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-left whitespace-nowrap">{student.nome || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                    <TableCell className="text-center whitespace-nowrap hidden sm:table-cell">{student.serie}</TableCell>
                    <TableCell className="text-center whitespace-nowrap hidden md:table-cell">{student.classe}</TableCell>
                    <TableCell className="text-center whitespace-nowrap hidden lg:table-cell">{student.turno}</TableCell>
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
                    <TableCell className="text-center whitespace-nowrap hidden lg:table-cell">{student.rm}</TableCell>
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
