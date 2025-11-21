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
import { User, Search, Edit, ArrowUpDown } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge, type BadgeProps } from "./ui/badge";
import { cn } from "@/lib/utils";

export interface SortConfig {
  key: string;
  direction: 'ascending' | 'descending';
}

interface UserTableProps {
  users: any[];
  profiles: any[];
  onEdit: (user: any) => void;
  onSort: (key: string) => void;
  sortConfig: SortConfig;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Função para determinar se a cor de fundo é clara ou escura
const isColorLight = (hexColor: string) => {
    if (!hexColor) return false;
    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
};


export default function UserTable({ users, profiles, onEdit, onSort, sortConfig }: UserTableProps) {
  
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

  const findProfile = (profileId: string) => {
    return profiles.find(p => p.id === profileId);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="name">Nome</SortableHeader>
                <SortableHeader sortKey="email" className="hidden md:table-cell">Email</SortableHeader>
                <SortableHeader sortKey="profileId">Perfil</SortableHeader>
                <SortableHeader sortKey="createdAt" className="hidden lg:table-cell">Data de Criação</SortableHeader>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const profile = findProfile(user.profileId);
                const profileName = profile ? profile.name : user.profileId;
                const profileColor = profile ? profile.color : '#808080';
                const textColor = isColorLight(profileColor) ? 'text-black' : 'text-white';


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
                             <Badge 
                                className={cn(textColor)}
                                style={{ backgroundColor: profileColor, border: `1px solid ${profileColor}` }}
                            >
                                {profileName}
                            </Badge>
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
