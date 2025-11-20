"use client";

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
import { collection } from "firebase/firestore";

const userEditSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  profileId: z.string().min(1, "O perfil é obrigatório."),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: Partial<UserEditFormValues>) => void;
}

export default function UserEditDialog({ isOpen, onClose, user, onSave }: UserEditDialogProps) {
  const firestore = useFirestore();
  const { data: profiles } = useCollection(
    firestore ? collection(firestore, 'profiles') : null
  );

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: '',
      profileId: ''
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        profileId: user.profileId || '',
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = (data: UserEditFormValues) => {
    onSave(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Utilizador</DialogTitle>
          <DialogDescription>
            Altere o nome e o perfil do utilizador.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles?.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                      ))}
                       {/* Fallback caso a coleção de perfis não carregue */}
                      {!profiles || profiles.length === 0 && (
                        <>
                            <SelectItem value="Administrador">Administrador</SelectItem>
                            <SelectItem value="Gestor">Gestor</SelectItem>
                            <SelectItem value="Professor">Professor</SelectItem>
                            <SelectItem value="Funcionario">Funcionário</SelectItem>
                            <SelectItem value="Aluno">Aluno</SelectItem>
                            <SelectItem value="Responsavel">Pais/Responsável</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
