
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
import { NotebookText } from "lucide-react";
import GradesUploader from "./grades-uploader";


export default function GradesUploaderSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
    <SheetTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2 shadow-lg">
            <NotebookText className="h-4 w-4" />
            <span>Carregar Notas</span>
        </Button>
    </SheetTrigger>
    <SheetContent className="flex flex-col">
        <SheetHeader>
        <SheetTitle>Carregar Notas do Boletim</SheetTitle>
        <SheetDescription>
            Envie um ficheiro XLSX com as notas dos alunos para uma etapa específica.
        </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
        <GradesUploader />
        </div>
    </SheetContent>
    </Sheet>
  );
}
