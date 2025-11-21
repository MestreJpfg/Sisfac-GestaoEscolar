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
import { Shield, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ProfileTableProps {
  profiles: any[];
  onEdit: (profile: any) => void;
  onDelete: (profile: any) => void;
}

export default function ProfileTable({ profiles, onEdit, onDelete }: ProfileTableProps) {
  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum perfil encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie um novo perfil para começar a gerir as permissões.
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
                <TableHead>Nome do Perfil</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <span>{profile.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground hidden md:table-cell">{profile.description}</TableCell>
                   <TableCell className="whitespace-nowrap">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                            {profile.permissions?.map((perm: string) => (
                                <Badge key={perm} variant="secondary">{perm.split(':')[1]}</Badge>
                            )) || <span className="text-xs text-muted-foreground">Nenhuma</span>}
                        </div>
                   </TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(profile)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(profile)} className="text-destructive hover:text-destructive">
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
