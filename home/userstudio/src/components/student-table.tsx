"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "./ui/card";
import { BookUser, Loader2, Search } from "lucide-react";
import { Badge } from "./ui/badge";

interface StudentTableProps {
  students: any[];
  isLoading: boolean;
  hasSearched: boolean;
  onRowClick: (student: any) => void;
}

export default function StudentTable({ students, isLoading, hasSearched, onRowClick }: StudentTableProps) {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">A buscar na base de dados...</p>
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
                    <p className="mt-1 text-sm text-muted-foreground">Tente um termo de busca diferente.</p>
                </>
            ) : (
                <>
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Pronto para a busca</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Use os filtros acima para pesquisar na base de dados.</p>
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
                <TableHead>Nome</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Data de Nasc.</TableHead>
                <TableHead>RM</TableHead>
                <TableHead>Filiação 1</TableHead>
                <TableHead>NEE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id} onClick={() => onRowClick(student)} className="cursor-pointer">
                  <TableCell className="font-medium">{student.nome || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                  <TableCell>{student.serie}</TableCell>
                  <TableCell>{student.classe}</TableCell>
                  <TableCell>{student.turno}</TableCell>
                  <TableCell>{student.data_nascimento}</TableCell>
                  <TableCell>{student.rm}</TableCell>
                  <TableCell>{student.filiacao_1}</TableCell>
                  <TableCell>
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
