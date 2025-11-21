
'use client';

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const subjectSchema = z.object({
  name: z.string().min(1, "O nome da disciplina é obrigatório."),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subject: any | null;
  onSave: (data: SubjectFormValues, subjectId?: string) => void;
}

export default function SubjectEditDialog({ isOpen, onClose, subject, onSave }: SubjectEditDialogProps) {
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (subject) {
      form.reset({ name: subject.name || '' });
    } else {
      form.reset({ name: '' });
    }
  }, [subject, isOpen, form]);

  const onSubmit = (data: SubjectFormValues) => {
    onSave(data, subject?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? 'Editar Disciplina' : 'Criar Nova Disciplina'}</DialogTitle>
          <DialogDescription>
            Defina o nome da disciplina.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Disciplina</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Educação Artística" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Disciplina</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
