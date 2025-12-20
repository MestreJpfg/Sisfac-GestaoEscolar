
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
import { Briefcase, Search, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export interface SortConfig {
  key: string;
  direction: 'ascending' | 'descending';
}

interface ServidorTableProps {
  servidores: any[];
  onEdit: (servidor: any) => void;
  onDelete: (servidor: any) => void;
  onSort: (key: string) => void;
  sortConfig: SortConfig;
}

const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function ServidorTable({ servidores, onEdit, onDelete, onSort, sortConfig }: ServidorTableProps) {
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: string, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig.key === sortKey;
    
    return (
        <TableHead className={cn(className)}>
            <Button variant="ghost" onClick={() => onSort(sortKey)} className="px-2 py-1 h-auto -ml-2">
                {children}
                <ArrowUpDown 
                    className={cn("ml-2 h-4 w-4 text-muted-foreground/50", isSorted && "text-foreground")} 
                />
            </Button>
        </TableHead>
    );
  }
  
  if (servidores.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum servidor encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente refinar a sua busca ou adicione novos servidores.
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
                <SortableHeader sortKey="nomeCompleto">Nome</SortableHeader>
                <SortableHeader sortKey="cpf" className="hidden sm:table-cell">CPF</SortableHeader>
                <SortableHeader sortKey="cargo" className="hidden md:table-cell">Cargo</SortableHeader>
                <SortableHeader sortKey="status" className="hidden lg:table-cell">Status</SortableHeader>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servidores.map((servidor) => (
                <TableRow key={servidor.id}>
                    <TableCell className="font-medium whitespace-nowrap">{servidor.nomeCompleto}</TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap text-muted-foreground">{formatCPF(servidor.cpf)}</TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">{servidor.cargo}</TableCell>
                    <TableCell className="hidden lg:table-cell whitespace-nowrap">
                        <Badge variant={servidor.status === 'Ativo' ? 'default' : 'secondary'}>{servidor.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(servidor)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(servidor)} className="text-destructive hover:text-destructive">
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
