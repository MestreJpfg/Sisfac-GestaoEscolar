
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

const subjectSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  diaPlanejamento: z.string().min(1, 'Selecione o dia de planejamento.'),
  horaAula: z.string().min(1, 'O campo hora-aula é obrigatório.'),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function SubjectForm() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      nome: '',
      diaPlanejamento: '',
      horaAula: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: SubjectFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de Conexão' });
      return;
    }

    addDocumentNonBlocking(collection(firestore, 'disciplinas'), {
      ...data,
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Cadastro Enviado!',
      description: `O cadastro da disciplina ${data.nome} está a ser processado.`,
    });
    
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Disciplina</CardTitle>
        <CardDescription>Preencha os dados abaixo para adicionar uma nova disciplina.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Disciplina</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Matemática" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="diaPlanejamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Planejamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Segunda-feira">Segunda-feira</SelectItem>
                        <SelectItem value="Terca-feira">Terça-feira</SelectItem>
                        <SelectItem value="Quarta-feira">Quarta-feira</SelectItem>
                        <SelectItem value="Quinta-feira">Quinta-feira</SelectItem>
                        <SelectItem value="Sexta-feira">Sexta-feira</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora-Aula</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 50min" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Disciplina
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
