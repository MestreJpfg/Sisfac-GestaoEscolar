"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "./ui/card";
import { ChevronLeft, ChevronRight, BookUser, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";

interface StudentTableProps {
  students: any[];
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLoading: boolean;
}

export default function StudentTable({ students, currentPage, totalPages, onNextPage, onPrevPage, isLoading }: StudentTableProps) {
  
  if (students.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
            <BookUser className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">A base de dados pode estar vazia. Tente carregar um ficheiro de alunos.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
           {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>RM</TableHead>
                <TableHead>Data de Nasc.</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Filiação 1</TableHead>
                <TableHead>NEE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.nome || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                  <TableCell>{student.rm}</TableCell>
                  <TableCell>{student.data_nascimento}</TableCell>
                  <TableCell>{student.serie}</TableCell>
                  <TableCell>{student.classe}</TableCell>
                  <TableCell>{student.turno}</TableCell>
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

      <div className="flex items-center justify-between p-4 border-t">
        <p className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onPrevPage} 
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1"/>
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onNextPage} 
            disabled={currentPage >= totalPages || isLoading}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1"/>
          </Button>
        </div>
      </div>
    </Card>
  );
}
