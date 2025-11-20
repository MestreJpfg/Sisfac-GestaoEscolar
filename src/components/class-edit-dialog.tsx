
'use client';

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, orderBy } from "firebase/firestore";

const classSchema = z.object({
  name: z.string().min(1, "O nome da turma é obrigatório."),
  teacherId: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any | null;
  onSave: (data: ClassFormValues, classId?: string) => void;
  isAuthorized: boolean;
}

export default function ClassEditDialog({ isOpen, onClose, classData, onSave, isAuthorized }: ClassEditDialogProps) {
  const firestore = useFirestore();
  
  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null; // Only query if authorized
    return query(
        collection(firestore, 'users'), 
        where('profileId', '==', 'Professor'),
        orderBy('name')
    );
  }, [firestore, isAuthorized]);

  const { data: teachers, isLoading: isLoadingTeachers } = useCollection(teachersQuery);
  
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      teacherId: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (classData) {
          form.reset({
            name: classData.name || '',
            teacherId: classData.teacherId || '',
          });
        } else {
          form.reset({
            name: '',
            teacherId: '',
          });
        }
    }
  }, [classData, isOpen, form]);

  const onSubmit = (data: ClassFormValues) => {
    const teacher = teachers?.find(t => t.id === data.teacherId);
    const submissionData: any = { ...data };
    if (teacher) {
        submissionData.teacherName = teacher.name;
    } else {
        submissionData.teacherName = "Não definido";
    }
    
    // Ensure teacherId is not an empty string if "none" is selected.
    if (!submissionData.teacherId) {
        delete submissionData.teacherId;
    }

    onSave(submissionData, classData?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{classData ? 'Editar Turma' : 'Criar Nova Turma'}</DialogTitle>
          <DialogDescription>
            Defina o nome da turma e atribua um professor responsável.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Turma</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 6º Ano A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professor(a) Responsável</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                    value={field.value || 'none'}
                    disabled={!isAuthorized}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isAuthorized ? (isLoadingTeachers ? "A carregar..." : "Selecione um professor (opcional)") : "Sem permissão para carregar"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Não definido</SelectItem>
                      {isAuthorized && !isLoadingTeachers && (
                        teachers?.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Turma</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
