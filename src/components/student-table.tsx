"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "./ui/card";
import { ChevronLeft, ChevronRight, BookUser } from "lucide-react";
import { Badge } from "./ui/badge";

interface StudentTableProps {
  students: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function StudentTable({ students, currentPage, totalPages, onPageChange }: StudentTableProps) {
  
  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
            <BookUser className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">A base de dados parece estar vazia ou ocorreu um erro ao carregar os dados.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                  <TableCell className="font-medium">{student.nome}</TableCell>
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
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1"/>
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage >= totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1"/>
          </Button>
        </div>
      </div>
    </Card>
  );
}
