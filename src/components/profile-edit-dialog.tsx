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

const permissionKeys = [
    'manage:students',
    'manage:attendance',
    'manage:grades',
    'manage:occurrences',
    'manage:transcript',
    'manage:announcements',
    'manage:cadastros',
    'manage:users',
    'manage:migration',
    'manage:database'
] as const;

const profileSchema = z.object({
  name: z.string().min(1, "O nome do perfil é obrigatório."),
  description: z.string().optional().nullable(),
  permissions: z.any(),
  color: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any | null;
  onSave: (data: ProfileFormValues, profileId?: string) => void;
}

const allPermissions = [
    { id: 'manage:students', label: 'Gestão de Alunos (Fichas, Documentos e Listas)' },
    { id: 'manage:attendance', label: 'Gestão de Frequência (Chamada e Relatórios)' },
    { id: 'manage:grades', label: 'Gestão de Notas (Lançamento e Boletins)' },
    { id: 'manage:occurrences', label: 'Gestão de Ocorrências Disciplinares' },
    { id: 'manage:transcript', label: 'Gestão de Históricos Escolares' },
    { id: 'manage:announcements', label: 'Gestão de Comunicados' },
    { id: 'manage:cadastros', label: 'Gestão de Servidores (RH)' },
    { id: 'manage:users', label: 'Gestão de Utilizadores e Perfis' },
    { id: 'manage:migration', label: 'Gestão de Anos Letivos (Transição)' },
    { id: 'manage:database', label: 'Gestão de Sistema e Base de Dados' },
];


export default function ProfileEditDialog({ isOpen, onClose, profile, onSave }: ProfileEditDialogProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: {},
      color: '#808080',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const basePermissions: Record<string, boolean> = {};
      permissionKeys.forEach(key => {
        basePermissions[key] = false;
      });

      if (profile && profile.id) {
        form.reset({
          name: profile.name || '',
          description: profile.description || '',
          permissions: { ...basePermissions, ...(profile.permissions || {}) },
          color: profile.color || '#808080',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          permissions: basePermissions,
          color: '#808080',
        });
      }
    }
  }, [profile, isOpen, form]);

  const onSubmit = (data: ProfileFormValues) => {
    const cleanedPermissions: Record<string, boolean> = {};
    if (data.permissions) {
        Object.keys(data.permissions).forEach(key => {
            cleanedPermissions[key] = !!data.permissions[key];
        });
    }

    onSave({
        ...data,
        permissions: cleanedPermissions
    }, profile?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{profile?.id ? 'Editar Perfil' : 'Criar Novo Perfil'}</DialogTitle>
          <DialogDescription>
            Defina o nome, a descrição e as permissões unificadas para este perfil.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
             <ScrollArea className="flex-1 pr-6 -mr-6">
               <div className="space-y-4 py-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Perfil</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Monitor(a)" />
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
                                <Input type="color" {...field} value={field.value ?? '#808080'} className="p-1 h-10 w-14 cursor-pointer" />
                                <Input 
                                    value={field.value ?? ''} 
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
                          <Textarea {...field} value={field.value ?? ''} placeholder="Descreva a responsabilidade deste perfil..." className="min-h-[60px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">Permissões Unificadas</FormLabel>
                        <p className="text-xs text-muted-foreground">
                        Cada opção abaixo concede acesso total (visualização e gestão) ao respetivo módulo.
                        </p>
                    </div>
                    <div className="grid gap-3 p-4 border rounded-lg bg-muted/20">
                    {allPermissions.map((item) => (
                        <FormField
                            key={item.id}
                            control={form.control}
                            name={`permissions.${item.id}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                        {item.label}
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                    ))}
                    </div>
                    <FormMessage />
                </FormItem>
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
