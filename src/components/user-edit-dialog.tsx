
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

const userEditSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  profileId: z.string().min(1, "O perfil é obrigatório."),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profiles: any[];
  onSave: (data: Partial<UserEditFormValues>) => void;
}

export default function UserEditDialog({ isOpen, onClose, user, profiles, onSave }: UserEditDialogProps) {
  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: '',
      profileId: ''
    },
  });

  useEffect(() => {
    if (user && isOpen) {
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles && profiles.length > 0 ? (
                        profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-profiles" disabled>Nenhum perfil criado</SelectItem>
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
