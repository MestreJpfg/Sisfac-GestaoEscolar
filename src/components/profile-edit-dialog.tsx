
'use client';

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";

const profileSchema = z.object({
  name: z.string().min(1, "O nome do perfil é obrigatório."),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  color: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any | null;
  onSave: (data: ProfileFormValues, profileId?: string) => void;
}

const allPermissions = [
    { id: 'manage:database', label: 'Gerir Base de Dados' },
    { id: 'manage:students', label: 'Gerir Alunos' },
    { id: 'view:students', label: 'Visualizar Alunos' },
    { id: 'manage:subjects', label: 'Gerir Disciplinas' },
    { id: 'manage:users', label: 'Gerir Utilizadores' },
    { id: 'manage:profiles', label: 'Gerir Perfis' },
    { id: 'manage:grades', label: 'Gerir Notas' },
    { id: 'manage:attendance', label: 'Gerir Frequência' },
    { id: 'manage:announcements', label: 'Gerir Anúncios' },
];

export default function ProfileEditDialog({ isOpen, onClose, profile, onSave }: ProfileEditDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      color: '#808080', // Cor padrão (cinza)
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        description: profile.description || '',
        permissions: profile.permissions || [],
        color: profile.color || '#808080',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        permissions: [],
        color: '#808080',
      });
    }
  }, [profile, isOpen, form]);

  const onSubmit = (data: ProfileFormValues) => {
    onSave(data, profile?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{profile ? 'Editar Perfil' : 'Criar Novo Perfil'}</DialogTitle>
          <DialogDescription>
            Defina o nome, a descrição e as permissões para este perfil.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
             <ScrollArea className="flex-1 pr-6 -mr-6">
               <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Perfil</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Professor Chefe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor do Perfil</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer" />
                                <Input 
                                    value={field.value} 
                                    onChange={field.onChange} 
                                    placeholder="#RRGGBB"
                                    className="flex-1"
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Descreva a responsabilidade deste perfil..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Permissões</FormLabel>
                            <p className="text-sm text-muted-foreground">
                            Selecione as ações que os utilizadores com este perfil podem realizar.
                            </p>
                        </div>
                        <div className="space-y-2">
                        {allPermissions.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    {item.label}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />


               </div>
             </ScrollArea>
             <DialogFooter className="pt-6 border-t mt-auto">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Perfil</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
