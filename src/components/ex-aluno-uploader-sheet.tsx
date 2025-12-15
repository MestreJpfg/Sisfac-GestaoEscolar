
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";
import ExAlunoUploader from "./ex-aluno-uploader";

interface ExAlunoUploaderSheetProps {
  onUploadSuccess: () => void;
}

export default function ExAlunoUploaderSheet({ onUploadSuccess }: ExAlunoUploaderSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUploadComplete = (count: number) => {
    // A chamada para onUploadSuccess é passada do pai.
    onUploadSuccess(); 
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2 shadow-lg">
          <Upload className="h-4 w-4" />
          <span>Carregar Ex-Alunos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Carregar Base de Ex-Alunos</SheetTitle>
          <SheetDescription>
            Envie um ficheiro XLSX ou CSV para adicionar ou atualizar dados na coleção de ex-alunos.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <ExAlunoUploader 
            onUploadComplete={handleUploadComplete} 
            setIsLoading={setIsLoading} 
            isLoading={isLoading} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

    