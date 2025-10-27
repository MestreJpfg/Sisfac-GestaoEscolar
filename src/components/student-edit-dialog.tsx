"use client";

import { useEffect, useState } from "react";
import { useForm } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const studentSchema = z.object({
  rm: z.string().min(1, "RM é obrigatório."),
  nome: z.string().min(1, "Nome é obrigatório."),
  ensino: z.string().nullable().optional(),
  serie: z.string().nullable().optional(),
  classe: z.string().nullable().optional(),
  turno: z.string().nullable().optional(),
  filiacao_1: z.string().nullable().optional(),
  filiacao_2: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  nis: z.string().nullable().optional(),
  id_censo: z.string().nullable().optional(),
  cpf_aluno: z.string().nullable().optional(),
  cpffiliacao1: z.string().nullable().optional(),
  data_nascimento: z.string().nullable().optional(),
  
  // Endereço dividido
  endereco_cep: z.string().nullable().optional(),
  endereco_rua: z.string().nullable().optional(),
  endereco_numero: z.string().nullable().optional(),
  endereco_bairro: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(), // Mantém o campo original

  telefones: z.array(z.string()).nullable().optional(),
  transporte_escolar: z.boolean().nullable().optional(),
  carteira_estudante: z.boolean().nullable().optional(),
  nee: z.string().nullable().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSave: (data: Partial<StudentFormValues>) => void;
}

const cleanData = (data: any) => {
    const cleaned: any = {};
    for (const key in data) {
        if (data[key] === '') {
            cleaned[key] = null;
        } else {
            cleaned[key] = data[key];
        }
    }
    return cleaned;
};

const parseAddress = (addressString: string) => {
    if (!addressString || typeof addressString !== 'string') {
      return { cep: '', rua: '', numero: '', bairro: '' };
    }
    const cleanedString = addressString.replace(/[()]/g, '');
    const parts = cleanedString.split(' - ').map(part => part.trim());

    if (parts.length === 4) {
      const [cep, rua, numero, bairro] = parts;
      return { cep, rua, numero, bairro };
    }
    return { cep: '', rua: addressString, numero: '', bairro: '' };
};

export default function StudentEditDialog({ isOpen, onClose, student, onSave }: StudentEditDialogProps) {
  const { toast } = useToast();
  const [isCepLoading, setIsCepLoading] = useState(false);
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (student) {
        const address = parseAddress(student.endereco);
        const defaultVals = {
            ...student,
            endereco_cep: address.cep,
            endereco_rua: address.rua,
            endereco_numero: address.numero,
            endereco_bairro: address.bairro,
            telefones: student.telefones || [],
            transporte_escolar: !!student.transporte_escolar,
            carteira_estudante: !!student.carteira_estudante
        };
        form.reset(defaultVals);
    }
  }, [student, form]);

  const handleCepChange = async (cep: string) => {
    const cleanedCep = cep?.replace(/\D/g, '') || '';
    if (cleanedCep.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({
            variant: "destructive",
            title: "CEP não encontrado",
            description: "O CEP digitado não foi encontrado.",
        });
        return;
      }
      form.setValue('endereco_rua', data.logradouro, { shouldValidate: true });
      form.setValue('endereco_bairro', data.bairro, { shouldValidate: true });
      toast({
        title: "Endereço encontrado!",
        description: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`,
      });
    } catch (error) {
      toast({
            variant: "destructive",
            title: "Erro ao buscar CEP",
            description: "Não foi possível buscar o endereço. Verifique sua conexão.",
        });
    } finally {
      setIsCepLoading(false);
    }
  };


  const onSubmit = (data: StudentFormValues) => {
    const { endereco_cep, endereco_rua, endereco_numero, endereco_bairro, ...restOfData } = data;
    
    let enderecoCompleto = '';
    if (endereco_cep || endereco_rua || endereco_numero || endereco_bairro) {
      enderecoCompleto = `(${endereco_cep || ''} - ${endereco_rua || ''} - ${endereco_numero || ''} - ${endereco_bairro || ''})`;
    }

    const finalData = {
        ...restOfData,
        endereco: enderecoCompleto || null,
    };
    onSave(cleanData(finalData));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Aluno</DialogTitle>
          <DialogDescription>
            Altere as informações do aluno. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
             <ScrollArea className="flex-1 pr-6 -mr-6">
                <Accordion type="multiple" defaultValue={["personal", "address", "academic"]} className="w-full">

                  {/* Dados Pessoais */}
                  <AccordionItem value="personal">
                    <AccordionTrigger>Dados Pessoais</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="rm" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>RM</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} disabled /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="data_nascimento" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="telefones" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefones (separados por vírgula)</FormLabel>
                          <FormControl><Input {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                       )} />
                    </AccordionContent>
                  </AccordionItem>
                  
                   {/* Endereço */}
                  <AccordionItem value="address">
                    <AccordionTrigger>Endereço</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="endereco_cep" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    value={field.value ?? ''} 
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      handleCepChange(e.target.value);
                                    }}
                                    maxLength={9}
                                  />
                                </FormControl>
                                {isCepLoading && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="endereco_bairro" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="endereco_rua" control={form.control} render={({ field }) => (
                            <FormItem className="md:col-span-2">
                            <FormLabel>Rua / Logradouro</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                         <FormField name="endereco_numero" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Dados de Documentos */}
                  <AccordionItem value="documents">
                    <AccordionTrigger>Documentos</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField name="rg" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="cpf_aluno" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF Aluno</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="nis" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>NIS</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="id_censo" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Censo</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Dados Académicos */}
                  <AccordionItem value="academic">
                    <AccordionTrigger>Dados Académicos</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField name="ensino" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ensino</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="serie" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Série</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="classe" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Classe</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="turno" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turno</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </AccordionContent>
                  </AccordionItem>

                   {/* Filiação */}
                  <AccordionItem value="family">
                    <AccordionTrigger>Filiação</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                        <FormField name="filiacao_1" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Filiação 1</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="cpffiliacao1" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>CPF Filiação 1</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="filiacao_2" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Filiação 2</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Outras Informações */}
                  <AccordionItem value="other">
                    <AccordionTrigger>Outras Informações</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                      <FormField name="nee" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Necessidades Educacionais Especiais (NEE)</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Transporte Escolar</FormLabel>
                            </div>
                            <FormControl>
                                <FormField name="transporte_escolar" control={form.control} render={({ field }) => (
                                    <Switch
                                        checked={field.value ?? false}
                                        onCheckedChange={field.onChange}
                                    />
                                )} />
                            </FormControl>
                        </div>
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Direito a Carteira de Estudante</FormLabel>
                            </div>
                            <FormControl>
                                <FormField name="carteira_estudante" control={form.control} render={({ field }) => (
                                    <Switch
                                        checked={field.value ?? false}
                                        onCheckedChange={field.onChange}
                                    />
                                )} />
                            </FormControl>
                        </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
             </ScrollArea>
             <DialogFooter className="pt-6 border-t mt-auto">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
