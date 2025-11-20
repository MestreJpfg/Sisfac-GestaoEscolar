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
import { useFirestore } from "@/firebase";
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
}

export default function ClassEditDialog({ isOpen, onClose, classData, onSave }: ClassEditDialogProps) {
  const firestore = useFirestore();
  const teachersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'users'), 
        where('profileId', '==', 'Professor'),
        orderBy('name')
    );
  }, [firestore]);

  const { data: teachers, isLoading: isLoadingTeachers } = useCollection(teachersQuery);
  
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      teacherId: '',
    },
  });

  useEffect(() => {
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
  }, [classData, isOpen, form]);

  const onSubmit = (data: ClassFormValues) => {
    const teacher = teachers?.find(t => t.id === data.teacherId);
    const submissionData = {
        ...data,
        teacherName: teacher?.name || '',
    };
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um professor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTeachers ? (
                        <SelectItem value="loading" disabled>A carregar professores...</SelectItem>
                      ) : (
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
