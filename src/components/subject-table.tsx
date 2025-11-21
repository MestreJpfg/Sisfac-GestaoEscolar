
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
import { BookCopy, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

interface SubjectTableProps {
  subjects: any[];
  onEdit: (subject: any) => void;
  onDelete: (subject: any) => void;
}

export default function SubjectTable({ subjects, onEdit, onDelete }: SubjectTableProps) {
  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma disciplina encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma nova disciplina para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Disciplina</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <BookCopy className="h-5 w-5 text-primary/80"/>
                      <span>{subject.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(subject)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
