'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "./ui/card";
import { School, Search, Edit, Trash2, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

interface ClassTableProps {
  classes: any[];
  onEdit: (classData: any) => void;
  onDelete: (classData: any) => void;
  isAuthorized: boolean;
}

export default function ClassTable({ classes, onEdit, onDelete, isAuthorized }: ClassTableProps) {
  const router = useRouter();

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma turma encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma nova turma para começar a organizar os alunos.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const handleRowClick = (classId: string) => {
    router.push(`/dashboard/classes/${classId}`);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Turma</TableHead>
                <TableHead>Professor(a) Responsável</TableHead>
                <TableHead>Nº de Alunos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow 
                  key={cls.id} 
                  onClick={() => handleRowClick(cls.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <School className="h-5 w-5 text-primary" />
                        <span>{cls.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{cls.teacherName || "Não definido"}</TableCell>
                   <TableCell className="whitespace-nowrap text-muted-foreground">
                        {cls.studentIds?.length || 0}
                   </TableCell>
                  <TableCell className="text-right">
                      {isAuthorized && (
                        <>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(cls); }}>
                              <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(cls); }} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 inline-block text-muted-foreground" />
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
