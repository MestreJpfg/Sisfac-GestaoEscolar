
'use client';

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const disciplineSchema = z.object({
  nome: z.string().min(1, "O nome da disciplina é obrigatório."),
  diaPlanejamento: z.string().optional(),
  horaAula: z.string().optional(),
});

type DisciplineFormValues = z.infer<typeof disciplineSchema>;

interface DisciplineEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DisciplineFormValues) => void;
}

export default function DisciplineEditDialog({ isOpen, onClose, onSave }: DisciplineEditDialogProps) {
  const form = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: {
      nome: '',
      diaPlanejamento: '',
      horaAula: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = (data: DisciplineFormValues) => {
    onSave(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Disciplina</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da nova disciplina.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Disciplina</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Matemática" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="diaPlanejamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Planeamento</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Segunda-feira" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="horaAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora/Aula (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="Ex: 50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <DialogFooter className="pt-6">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Disciplina</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
