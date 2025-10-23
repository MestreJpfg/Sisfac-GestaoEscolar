"use client";

import { useState, useEffect } from "react";
import { doc } from "firebase/firestore";
import { useFirestore, setDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { type DataItem, type SubItem } from "./data-viewer";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditStudentFormProps {
  student: DataItem;
  onClose: () => void;
  onEditComplete: (updatedStudent: DataItem) => void;
}

export default function EditStudentForm({ student, onClose, onEditComplete }: EditStudentFormProps) {
  const [mainItem, setMainItem] = useState('');
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setMainItem(student.mainItem || '');
    if (student.subItems && Array.isArray(student.subItems)) {
      setSubItems(student.subItems);
    } else {
      setSubItems([]);
    }
  }, [student]);

  const handleSubItemChange = (index: number, value: string) => {
    setSubItems((prev) => {
      const newSubItems = [...prev];
      newSubItems[index] = { ...newSubItems[index], value };
      return newSubItems;
    });
  };
  
  const studentRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "students", student.id);
  }, [firestore, student.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRef) {
      toast({ variant: "destructive", title: "Erro", description: "O serviço do banco de dados não está disponível." });
      return;
    }

    setIsLoading(true);
    
    const updatedData = {
      mainItem,
      subItems,
    };
      
    // Use non-blocking update
    setDocumentNonBlocking(studentRef, updatedData);

    toast({
      title: "Sucesso!",
      description: "Os dados do aluno foram atualizados.",
    });

    // Pass the updated student data back to the parent
    onEditComplete({ ...student, ...updatedData });
    setIsLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95%] sm:max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Aluno: {student.mainItem || ''}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-2">
              <Label htmlFor="main-item" className="font-semibold text-muted-foreground">
                NOME DE REGISTRO CIVIL
              </Label>
              <Input
                id="main-item"
                value={mainItem}
                onChange={(e) => setMainItem(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">
              {subItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="space-y-2">
                  <Label htmlFor={`item-${index}`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate" title={item.label}>
                    {item.label}
                  </Label>
                  <Input
                    id={`item-${index}`}
                    value={item.value || ''}
                    onChange={(e) => handleSubItemChange(index, e.target.value)}
                    className={cn(!item.value && 'opacity-70')}
                  />
                </div>
              ))}
            </div>
        </div>
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
