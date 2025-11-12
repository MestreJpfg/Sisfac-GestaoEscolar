
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";


export default function GradesUploaderSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="h-16 w-16 rounded-full shadow-lg p-0 flex items-center justify-center">
                    <NotebookText className="h-8 w-8" />
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
        </TooltipTrigger>
        <TooltipContent side="left">
            <p>Carregar Notas</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
