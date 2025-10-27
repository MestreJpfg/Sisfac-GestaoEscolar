"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "./ui/card";
import { BookUser, Loader2, Search } from "lucide-react";
import { Badge } from "./ui/badge";

interface StudentTableProps {
  students: any[];
  isLoading: boolean;
  onRowClick: (student: any) => void;
  hasSearched: boolean;
}

export default function StudentTable({ students, isLoading, onRowClick, hasSearched }: StudentTableProps) {
  
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
                    <p className="mt-1 text-sm text-muted-foreground">Tente um termo de busca diferente ou refine os seus filtros.</p>
                </>
            ) : (
                 <>
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno exibido</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Use os filtros acima para começar a pesquisar.</p>
                </>
            )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Nome</TableHead>
                <TableHead className="text-center">Série</TableHead>
                <TableHead className="text-center">Classe</TableHead>
                <TableHead className="text-center">Turno</TableHead>
                <TableHead className="text-center">Data de Nasc.</TableHead>
                <TableHead className="text-center">RM</TableHead>
                <TableHead className="text-center">NEE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id} onClick={() => onRowClick(student)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-left whitespace-nowrap">{student.nome || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{student.serie}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{student.classe}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{student.turno}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{student.data_nascimento}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">{student.rm}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {student.nee ? <Badge variant="destructive">SIM</Badge> : <Badge variant="secondary">NÃO</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
