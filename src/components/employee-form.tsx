
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const employeeSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cargo: z.string().min(1, 'Selecione um cargo.'),
  turno: z.string().min(1, 'Selecione um turno.'),
  cargaHoraria: z.string().min(1, 'A carga horária é obrigatória.'),
  vinculo: z.string().min(1, 'Selecione um vínculo.'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nome: '',
      cargo: '',
      turno: '',
      cargaHoraria: '',
      vinculo: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: EmployeeFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de Conexão' });
      return;
    }
    
    // Utiliza a função não-bloqueante para adicionar o documento
    addDocumentNonBlocking(collection(firestore, 'funcionarios'), {
      ...data,
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Cadastro Enviado!',
      description: `O cadastro do funcionário ${data.nome} está a ser processado.`,
    });
    
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Funcionário</CardTitle>
        <CardDescription>Preencha os dados abaixo para adicionar um novo funcionário.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do funcionário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Professor">Professor</SelectItem>
                        <SelectItem value="Coordenador">Coordenador</SelectItem>
                        <SelectItem value="Diretor">Diretor</SelectItem>
                        <SelectItem value="Secretario">Secretário(a)</SelectItem>
                        <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="turno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o turno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manha">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                        <SelectItem value="Integral">Integral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargaHoraria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária (h/semana)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 40h" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vinculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vínculo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o vínculo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Efetivo">Efetivo</SelectItem>
                        <SelectItem value="Temporario">Temporário</SelectItem>
                        <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Funcionário
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
