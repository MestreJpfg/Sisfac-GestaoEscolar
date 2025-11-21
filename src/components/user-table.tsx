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
import { User, Search, Edit } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface UserTableProps {
  users: any[];
  profiles: any[];
  onEdit: (user: any) => void;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function UserTable({ users, profiles, onEdit }: UserTableProps) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum utilizador encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente refinar os seus filtros ou verifique se existem utilizadores registados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
        return dateString;
    }
  };

  const getProfileBadgeVariant = (profileName: string | undefined) : "default" | "secondary" | "destructive" | "outline" => {
    switch (profileName) {
        case 'Administrador':
            return 'destructive';
        case 'Gestor':
        case 'Funcionário(a)':
            return 'default';
        case 'Professor':
            return 'secondary';
        default:
            return 'outline';
    }
  }

  const findProfileName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile ? profile.name : profileId;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="hidden lg:table-cell">Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const profileName = findProfileName(user.profileId);
                return (
                    <TableRow key={user.uid}>
                    <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.photoURL} alt={user.name} />
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground hidden md:table-cell">{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap">
                        {profileName ? (
                            <Badge variant={getProfileBadgeVariant(profileName)}>{profileName}</Badge>
                        ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground hidden lg:table-cell">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                            <Edit className="h-4 w-4" />
                        </Button>
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
