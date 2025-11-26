"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, doc } from "firebase/firestore";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import FileUploader from "./file-uploader";
import { Upload } from "lucide-react";

interface GenericUploaderProps {
  collectionName: 'funcionarios' | 'disciplinas';
  title: string;
  description: string;
  onUploadSuccess: () => void;
}

export default function GenericUploader({ collectionName, title, description, onUploadSuccess }: GenericUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const normalizeData = (data: any[]): any[] => {
    if (!data || data.length < 2) return [];

    const headers: string[] = data[0].map((header: any) => {
        let h = String(header).trim().toLowerCase().replace(/\s+/g, ''); // remove spaces
        
        // Specific renaming for 'disciplinas' collection
        if (collectionName === 'disciplinas') {
            if (h === 'diadeplanejamento' || h === 'diaplanejamento') return 'diaPlanejamento';
            if (h === 'horaaula') return 'horaAula';
        }
        
        return h;
    });
    
    return data.slice(1).map(row => {
      const item: any = {};
      row.forEach((value: any, index: number) => {
        const header = headers[index];
        if (header) {
          // For 'disciplinas', ensure 'horaAula' is a string
          if (collectionName === 'disciplinas' && header === 'horaAula' && value !== null && value !== undefined) {
             item[header] = String(value);
          } else {
             item[header] = value;
          }
        }
      });
      return item;
    }).filter(item => Object.keys(item).length > 0 && item.nome); // Ensure item has a name
  };

  const handleUploadComplete = async (data: any[]) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "A conexão com a base de dados não foi estabelecida."
      });
      return;
    }
  
    setIsLoading(true);
  
    const normalizedData = normalizeData(data);
    
    if (normalizedData.length === 0) {
      toast({
        variant: "destructive",
        title: "Dados Inválidos",
        description: "O ficheiro não contém dados válidos, está mal formatado, ou falta a coluna 'nome'.",
      });
      setIsLoading(false);
      return;
    }
  
    const collectionRef = collection(firestore, collectionName);
    
    normalizedData.forEach(item => {
        const newDocRef = doc(collectionRef);
        const docData: any = {
            ...item,
            id: newDocRef.id,
            createdAt: new Date().toISOString()
        };
        
        // Ensure all fields expected by the schema are at least present, even if null
        if (collectionName === 'disciplinas') {
            docData.diaPlanejamento = item.diaPlanejamento || null;
            docData.horaAula = item.horaAula ? String(item.horaAula) : null;
        }

        setDocumentNonBlocking(newDocRef, docData);
    });

    toast({
        title: "Carregamento em progresso!",
        description: `${normalizedData.length} registos de ${collectionName} estão a ser processados.`,
    });

    onUploadSuccess();
    setIsOpen(false);
    setIsLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {title}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {description}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
