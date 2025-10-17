"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
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
  const [mainItem, setMainItem] = useState('');
  const [subItems, setSubItems] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    setMainItem(student.mainItem || '');
    setSubItems(student.subItems || {});
  }, [student]);

  const handleSubItemChange = (label: string, value: string) => {
    setSubItems((prev) => ({ ...prev, [label]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Erro", description: "O serviço do banco de dados não está disponível ou o usuário não está autenticado." });
      return;
    }

    setIsLoading(true);
    const studentRef = doc(firestore, "users", user.uid, "students", student.id);
    
    const updatedData = {
      mainItem,
      subItems,
    };
      
    updateDoc(studentRef, updatedData).then(() => {
      toast({
        title: "Sucesso!",
        description: "Os dados do aluno foram atualizados.",
      });
      onEditComplete();
    }).catch(error => {
      const permissionError = new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: updatedData
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95%] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Aluno: {student.mainItem || ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-96 pr-6">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="main-item" className="sm:text-right break-words">
                  NOME DE REGISTRO CIVIL
                </Label>
                <Input
                  id="main-item"
                  value={mainItem}
                  onChange={(e) => setMainItem(e.target.value)}
                  className="sm:col-span-3"
                />
              </div>
              {Object.keys(subItems).map((key, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor={`item-${index}`} className="sm:text-right break-words">
                    {key}
                  </Label>
                  <Input
                    id={`item-${index}`}
                    value={subItems[key] || ''}
                    onChange={(e) => handleSubItemChange(key, e.target.value)}
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
