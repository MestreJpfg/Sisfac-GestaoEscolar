"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
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
import { type DataItem } from "./data-viewer";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface EditStudentFormProps {
  student: DataItem;
  onClose: () => void;
  onEditComplete: () => void;
}

export default function EditStudentForm({ student, onClose, onEditComplete }: EditStudentFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    const initialData = student.subItems.reduce((acc, item) => {
      acc[item.label] = item.value;
      return acc;
    }, {} as Record<string, string>);
    initialData['Nome do Aluno'] = student.mainItem;
    setFormData(initialData);
  }, [student]);

  const handleInputChange = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) {
      toast({ variant: "destructive", title: "Erro", description: "O serviço do banco de dados não está disponível." });
      return;
    }

    setIsLoading(true);
    try {
      const studentRef = doc(firestore, "students", student.id);
      
      const newMainItem = formData['Nome do Aluno'] || student.mainItem;
      const newSubItems = student.subItems.map(item => ({
        ...item,
        value: formData[item.label] !== undefined ? formData[item.label] : item.value,
      }));

      await updateDoc(studentRef, {
        mainItem: newMainItem,
        subItems: newSubItems
      });

      toast({
        title: "Sucesso!",
        description: "Os dados do aluno foram atualizados.",
      });
      onEditComplete();
    } catch (error) {
      console.error("Erro ao atualizar o aluno: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95%] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Aluno: {student.mainItem}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-96 pr-6">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="mainItem" className="sm:text-right">
                  Nome do Aluno
                </Label>
                <Input
                  id="mainItem"
                  value={formData['Nome do Aluno'] || ''}
                  onChange={(e) => handleInputChange('Nome do Aluno', e.target.value)}
                  className="sm:col-span-3"
                />
              </div>
              {student.subItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor={`subItem-${index}`} className="sm:text-right">
                    {item.label}
                  </Label>
                  <Input
                    id={`subItem-${index}`}
                    value={formData[item.label] || ''}
                    onChange={(e) => handleInputChange(item.label, e.target.value)}
                    className="sm:col-span-3"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 flex-col sm:flex-row space-y-2 sm:space-y-0">
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
