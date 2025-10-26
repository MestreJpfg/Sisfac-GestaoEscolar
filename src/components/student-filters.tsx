"use client";

import { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface StudentFiltersState {
  serie?: string;
  turno?: string;
  classe?: string;
  transporte_escolar?: boolean;
  nee?: boolean;
  search?: string;
}

interface StudentFiltersProps {
  onFilterChange: (filters: StudentFiltersState) => void;
}

export default function StudentFilters({ onFilterChange }: StudentFiltersProps) {
  const [filters, setFilters] = useState<StudentFiltersState>({});
  const [searchTerm, setSearchTerm] = useState('');

  const series = useMemo(() => ["INFANTIL II", "INFANTIL III", "INFANTIL IV", "INFANTIL V", "1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO", "1ª SÉRIE", "2ª SÉRIE", "3ª SÉRIE"], []);
  const turnos = useMemo(() => ["MANHA", "TARDE", "NOITE"], []);
  const classes = useMemo(() => ["A", "B", "C", "D", "E", "F", "U"], []);

  const handleInputChange = (key: keyof StudentFiltersState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };
  
  const handleSelectChange = (key: keyof StudentFiltersState) => (value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
  };

  const handleCheckboxChange = (key: keyof StudentFiltersState) => (checked: boolean) => {
    const newFilters = { ...filters, [key]: checked || undefined };
    setFilters(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm || undefined });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    onFilterChange({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
              <Label htmlFor="search">Pesquisar por Nome ou RM</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite o nome ou RM do aluno..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Select Filters */}
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="serie">Série</Label>
                <Select value={filters.serie} onValueChange={handleSelectChange('serie')}>
                    <SelectTrigger id="serie"><SelectValue placeholder="Todas as séries" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as séries</SelectItem>
                        {series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="turno">Turno</Label>
                <Select value={filters.turno} onValueChange={handleSelectChange('turno')}>
                    <SelectTrigger id="turno"><SelectValue placeholder="Todos os turnos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os turnos</SelectItem>
                        {turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="classe">Classe</Label>
                <Select value={filters.classe} onValueChange={handleSelectChange('classe')}>
                    <SelectTrigger id="classe"><SelectValue placeholder="Todas as classes" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as classes</SelectItem>
                        {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          
          {/* Checkbox Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="transporte" checked={!!filters.transporte_escolar} onCheckedChange={handleCheckboxChange('transporte_escolar')} />
              <Label htmlFor="transporte" className="font-normal cursor-pointer">Com Transporte Escolar</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="nee" checked={!!filters.nee} onCheckedChange={handleCheckboxChange('nee')} />
              <Label htmlFor="nee" className="font-normal cursor-pointer">Com Necessidades Especiais (NEE)</Label>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
             <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
