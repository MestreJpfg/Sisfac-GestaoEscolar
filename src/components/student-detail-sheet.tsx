"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { User, Calendar, Book, Clock, Users, Phone, Bus, CreditCard, AlertTriangle, FileText, Hash } from "lucide-react";

interface StudentDetailSheetProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start space-x-4">
      <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="text-base text-foreground font-medium">
          {typeof value === 'boolean' ? 
            (value ? <Badge variant="destructive">SIM</Badge> : <Badge variant="secondary">NÃO</Badge>) :
            Array.isArray(value) ? (
              <div className="flex flex-col space-y-1">
                {value.map((item, index) => <span key={index}>{item}</span>)}
              </div>
            ) :
            (value)
          }
        </div>
      </div>
    </div>
  );
};


export default function StudentDetailSheet({ student, isOpen, onClose }: StudentDetailSheetProps) {
  if (!student) return null;

  const studentDetails = [
    { label: "RM", value: student.rm, icon: Hash },
    { label: "Data de Nascimento", value: student.data_nascimento, icon: Calendar },
    { label: "RG", value: student.rg, icon: FileText },
    { label: "CPF Aluno", value: student.cpf_aluno, icon: FileText },
    { label: "NIS", value: student.nis, icon: Hash },
    { label: "ID Censo", value: student.id_censo, icon: Hash },
    { label: "Endereço", value: student.endereco, icon: User },
    { label: "Telefones", value: student.telefones, icon: Phone },
  ];

  const academicDetails = [
    { label: "Ensino", value: student.ensino, icon: Book },
    { label: "Série", value: student.serie, icon: Book },
    { label: "Classe", value: student.classe, icon: Users },
    { label: "Turno", value: student.turno, icon: Clock },
  ];

  const familyDetails = [
    { label: "Filiação 1", value: student.filiacao_1, icon: User },
    { label: "CPF Filiação 1", value: student.cpffiliacao1, icon: FileText },
    { label: "Filiação 2", value: student.filiacao_2, icon: User },
  ];

  const otherDetails = [
    { label: "Transporte Escolar", value: student.transporte_escolar, icon: Bus },
    { label: "Carteira de Estudante", value: student.carteira_estudante, icon: CreditCard },
    { label: "Necessidades Especiais (NEE)", value: student.nee, icon: AlertTriangle },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <ScrollArea className="h-full pr-6">
          <SheetHeader className="text-left mb-6">
            <SheetTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <User size={28}/>
              {student.nome || "Detalhes do Aluno"}
            </SheetTitle>
            <SheetDescription>
              Informações completas do aluno.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Dados Pessoais</h3>
              <div className="space-y-4">
                {studentDetails.map(item => <DetailItem key={item.label} {...item} />)}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Dados Académicos</h3>
              <div className="space-y-4">
                {academicDetails.map(item => <DetailItem key={item.label} {...item} />)}
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Filiação</h3>
              <div className="space-y-4">
                {familyDetails.map(item => <DetailItem key={item.label} {...item} />)}
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Outras Informações</h3>
              <div className="space-y-4">
                {otherDetails.map(item => <DetailItem key={item.label} {...item} />)}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
