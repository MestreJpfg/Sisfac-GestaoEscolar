
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const servidorSchema = z.object({
  nomeCompleto: z.string().min(3, "O nome completo é obrigatório."),
  dataNascimento: z.date({ required_error: "A data de nascimento é obrigatória." }),
  cpf: z.string().min(11, "O CPF deve ter 11 dígitos.").max(14, "O CPF deve ter no máximo 14 caracteres."),
  rg: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Formato de e-mail inválido.").optional().or(z.literal('')),
  cargo: z.string().min(2, "O cargo é obrigatório."),
  departamento: z.string().optional(),
  dataAdmissao: z.date({ required_error: "A data de admissão é obrigatória." }),
  salario: z.coerce.number().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  status: z.string().min(1, "O status é obrigatório."),
});

type ServidorFormValues = z.infer<typeof servidorSchema>;

export default function ServidorForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ServidorFormValues>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      nomeCompleto: '',
      cpf: '',
      rg: '',
      endereco: '',
      telefone: '',
      email: '',
      cargo: '',
      departamento: '',
      salario: undefined,
      banco: '',
      agencia: '',
      conta: '',
      status: 'Ativo',
    },
  });

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };
  
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };


  const onSubmit = async (data: ServidorFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de conexão.', description: 'Utilizador não autenticado.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const servidorCollectionRef = collection(firestore, 'users', user.uid, 'servidores');
      const id = doc(servidorCollectionRef).id;

      const servidorData = {
        ...data,
        id,
        dataNascimento: format(data.dataNascimento, 'yyyy-MM-dd'),
        dataAdmissao: format(data.dataAdmissao, 'yyyy-MM-dd'),
        cpf: data.cpf.replace(/\D/g, ''),
        salario: data.salario || null,
        dadosBancarios: {
            banco: data.banco,
            agencia: data.agencia,
            conta: data.conta,
        }
      };

      delete (servidorData as any).banco;
      delete (servidorData as any).agencia;
      delete (servidorData as any).conta;
      
      const docRef = doc(servidorCollectionRef, id);
      setDocumentNonBlocking(docRef, servidorData);

      toast({
        title: "Servidor Cadastrado!",
        description: `${data.nomeCompleto} foi adicionado(a) à base de dados.`,
      });

      form.reset();

    } catch (error) {
      console.error("Erro ao cadastrar servidor:", error);
      toast({ variant: 'destructive', title: 'Erro ao cadastrar' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Cadastro de Servidor</CardTitle>
        <CardDescription>Preencha os dados abaixo para cadastrar um novo servidor.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
              
              <AccordionItem value="item-1">
                <AccordionTrigger>Informações Pessoais</AccordionTrigger>
                <AccordionContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                    control={form.control}
                    name="nomeCompleto"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Nascimento</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} disabled={(date) => date > new Date()} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl><Input {...field} onChange={(e) => field.onChange(formatCPF(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField control={form.control} name="rg" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="endereco" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl><Input {...field} placeholder="Rua, Nº, Bairro, Cidade - UF" value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="telefone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} placeholder="(XX) XXXXX-XXXX" value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>Informações Funcionais</AccordionTrigger>
                <AccordionContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="cargo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="departamento" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataAdmissao"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Admissão</FormLabel>
                         <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} disabled={(date) => date > new Date()} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="salario" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário (Bruto)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="Ativo">Ativo</SelectItem>
                              <SelectItem value="Inativo">Inativo</SelectItem>
                              <SelectItem value="Férias">Férias</SelectItem>
                              <SelectItem value="Licença">Licença</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Informações Bancárias</AccordionTrigger>
                <AccordionContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem> <FormLabel>Banco</FormLabel> <FormControl><Input {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>
                    )} />
                    <FormField control={form.control} name="agencia" render={({ field }) => (
                        <FormItem> <FormLabel>Agência</FormLabel> <FormControl><Input {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>
                    )} />
                    <FormField control={form.control} name="conta" render={({ field }) => (
                        <FormItem> <FormLabel>Conta Corrente</FormLabel> <FormControl><Input {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>
                    )} />
                </AccordionContent>
              </AccordionItem>

            </Accordion>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'A Guardar...' : 'Guardar Servidor'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
