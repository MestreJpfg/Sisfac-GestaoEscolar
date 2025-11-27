
'use client';

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFirestore } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { MultiSelect } from "./multi-select";


const announcementSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  content: z.string().min(1, "O conteúdo é obrigatório."),
  targetAudience: z.array(z.string()).min(1, "Selecione pelo menos um destinatário."),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface AnnouncementEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: any | null;
  onSave: (data: AnnouncementFormValues, announcementId?: string) => void;
}

export default function AnnouncementEditDialog({ isOpen, onClose, announcement, onSave }: AnnouncementEditDialogProps) {
  const firestore = useFirestore();

  const profilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'profiles'), orderBy('name'));
  }, [firestore]);
  
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      targetAudience: [],
    },
  });

  useEffect(() => {
    if (announcement && isOpen) {
      form.reset({
        title: announcement.title || '',
        content: announcement.content || '',
        targetAudience: announcement.targetAudience || [],
      });
    } else {
        form.reset({
            title: '',
            content: '',
            targetAudience: [],
        });
    }
  }, [announcement, isOpen, form]);

  const onSubmit = (data: AnnouncementFormValues) => {
    onSave(data, announcement?.id);
  };
  
  const audienceOptions = [
    { value: 'all', label: 'Todos os Utilizadores' },
    ...(profiles?.map(p => ({ value: p.id, label: `Perfil: ${p.name}` })) || [])
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{announcement ? 'Editar Comunicado' : 'Criar Novo Comunicado'}</DialogTitle>
          <DialogDescription>
            Escreva o seu comunicado e defina para quem ele será enviado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Feriado na próxima semana" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo do Comunicado</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Escreva aqui a sua mensagem detalhada..." className="min-h-[120px]"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Destinatários</FormLabel>
                        <MultiSelect
                            options={audienceOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione os destinatários..."
                            isLoading={isLoadingProfiles}
                        />
                        <FormMessage />
                    </FormItem>
                )}
             />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Comunicado</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
