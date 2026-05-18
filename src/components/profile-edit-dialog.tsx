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
    'view:students', 'manage:students',
    'view:users', 'manage:users',
    'view:profiles', 'manage:profiles',
    'view:grades', 'manage:grades',
    'view:attendance', 'manage:attendance',
    'view:announcements', 'manage:announcements',
    'view:database', 'manage:database',
    'manage:cadastros', 'manage:migration', 'manage:transcript', 'manage:occurrences'
] as const;

// Usamos z.any() para as permissões para evitar que erros de validação silenciosos bloqueiem o formulário
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
    { id: 'view:students', label: 'Visualizar Alunos' },
    { id: 'manage:students', label: 'Gerir Alunos (Criar, Editar, Apagar)' },
    { id: 'view:users', label: 'Visualizar Utilizadores' },
    { id: 'manage:users', label: 'Gerir Utilizadores (Criar, Editar, Apagar)' },
    { id: 'view:profiles', label: 'Visualizar Perfis e Permissões' },
    { id: 'manage:profiles', label: 'Gerir Perfis e Permissões' },
    { id: 'view:grades', label: 'Visualizar Notas e Boletins' },
    { id: 'manage:grades', label: 'Gerir Notas (Lançar, Editar)' },
    { id: 'view:attendance', label: 'Visualizar Frequência' },
    { id: 'manage:attendance', label: 'Gerir Frequência (Lançar, Editar)' },
    { id: 'view:announcements', label: 'Visualizar Comunicados' },
    { id: 'manage:announcements', label: 'Gerir Comunicados (Criar, Editar, Apagar)' },
    { id: 'view:database', label: 'Visualizar Ferramentas de Base de Dados' },
    { id: 'manage:database', label: 'Gerir Base de Dados (Importar, Exportar, Apagar)' },
    { id: 'manage:cadastros', label: 'Gerir Cadastro de Servidores' },
    { id: 'manage:migration', label: 'Gerir Migração de Ano Letivo' },
    { id: 'manage:transcript', label: 'Gerir Históricos Escolares' },
    { id: 'manage:occurrences', label: 'Gerir Registro de Ocorrências' },
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
    // Garantimos que todas as permissões enviadas sejam booleanas puras
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
      <DialogContent className="sm:max-w-lg h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{profile?.id ? 'Editar Perfil' : 'Criar Novo Perfil'}</DialogTitle>
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
                          <Textarea {...field} value={field.value ?? ''} placeholder="Descreva a responsabilidade deste perfil..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            name={`permissions.${item.id}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
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