
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Esquema ultra-permissivo para evitar bloqueios de validação por campos inesperados
const studentSchema = z.record(z.any());

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSave: (data: any) => void;
}

const cleanData = (data: any) => {
    const cleaned: any = {};
    for (const key in data) {
        const value = data[key];
        // Converte strings vazias para null para limpar o banco, mas mantém objetos como o boletim
        if (value === '' || value === undefined) {
            cleaned[key] = null;
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

const parseAddress = (addressString: string) => {
    if (!addressString || typeof addressString !== 'string') {
      return { cep: '', rua: '', numero: '', bairro: '' };
    }
    // Formato esperado: (CEP) - RUA - NUMERO - BAIRRO
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
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (student && isOpen) {
        const address = parseAddress(student.endereco);
        // Populamos o formulário com TODOS os dados do aluno para garantir que nada se perca
        const defaultVals = {
            ...student,
            rm: String(student.rm || ''),
            nome: student.nome || '',
            endereco_cep: address.cep,
            endereco_rua: address.rua,
            endereco_numero: address.numero,
            endereco_bairro: address.bairro,
            telefones: Array.isArray(student.telefones) ? student.telefones : (student.telefone ? [student.telefone] : []),
            transporte_escolar: !!student.transporte_escolar,
            carteira_estudante: !!student.carteira_estudante
        };
        form.reset(defaultVals);
    }
  }, [student, isOpen, form]);

  const handleCepChange = async (cep: string) => {
    const cleanedCep = cep?.replace(/\D/g, '') || '';
    if (cleanedCep.length !== 8) return;

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
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    } finally {
      setIsCepLoading(false);
    }
  };

  const onSubmit = async (values: StudentFormValues) => {
    setIsSaving(true);
    try {
        const { endereco_cep, endereco_rua, endereco_numero, endereco_bairro, ...restOfData } = values;
        
        // Reconstrói o endereço no formato padrão do sistema
        let enderecoCompleto = '';
        if (endereco_cep || endereco_rua || endereco_numero || endereco_bairro) {
          enderecoCompleto = `(${endereco_cep || ''}) - ${endereco_rua || ''} - ${endereco_numero || ''} - ${endereco_bairro || ''}`;
        }

        // Processa os dados para garantir que campos de texto fiquem em MAIÚSCULAS (exceto IDs e objetos)
        const processedData: any = {};
        for (const key in restOfData) {
            const value = restOfData[key];
            if (typeof value === 'string' && !['id', 'rm', 'email'].includes(key)) {
                processedData[key] = value.toUpperCase();
            } else {
                processedData[key] = value;
            }
        }

        // Mescla com os dados originais do aluno para não perder campos não editáveis no formulário (como o boletim completo)
        const finalData = {
            ...student, 
            ...processedData,
            endereco: enderecoCompleto.toUpperCase() || null,
        };
        
        // Envia para o pai (StudentDetailSheet)
        await onSave(cleanData(finalData));
    } catch (error) {
        console.error("Erro ao processar salvamento:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Ocorreu um erro interno ao processar os dados.",
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Ficha do Aluno</DialogTitle>
          <DialogDescription>
            Altere qualquer informação do aluno. As mudanças serão aplicadas ao RM atual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Erros de validação:", errors);
                toast({
                    variant: "destructive",
                    title: "Verifique o Formulário",
                    description: "Alguns campos impediram o salvamento. Por favor, revise os dados inseridos.",
                });
            })} 
            className="flex-1 flex flex-col min-h-0"
          >
             <ScrollArea className="flex-1 pr-6 -mr-6">
                <Accordion type="multiple" defaultValue={["personal", "academic"]} className="w-full">

                  <AccordionItem value="personal">
                    <AccordionTrigger className="text-primary font-bold">1. Identificação e Contato</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 px-1">
                      <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="rm" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>RM (Registro Acadêmico)</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="data_nascimento" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} placeholder="DD/MM/AAAA" /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                      </div>
                       <FormField name="telefones" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefones (separe por vírgula)</FormLabel>
                          <FormControl><Input {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                       )} />
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="address">
                    <AccordionTrigger className="text-primary font-bold">2. Localização / Endereço</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 px-1">
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
                            <FormLabel>Número / Complemento</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="documents">
                    <AccordionTrigger className="text-primary font-bold">3. Documentação</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 px-1">
                       <FormField name="rg" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="cpf_aluno" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF do Aluno</FormLabel>
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

                  <AccordionItem value="academic">
                    <AccordionTrigger className="text-primary font-bold">4. Vínculo Académico</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 px-1">
                       <FormField name="ensino" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Ensino</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="serie" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Série / Ano</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="classe" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turma / Classe</FormLabel>
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

                  <AccordionItem value="family">
                    <AccordionTrigger className="text-primary font-bold">5. Composição Familiar</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 px-1">
                        <FormField name="filiacao_1" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nome da Mãe (ou Responsável 1)</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="cpffiliacao1" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>CPF da Mãe/Responsável 1</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="filiacao_2" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nome do Pai (ou Responsável 2)</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="other">
                    <AccordionTrigger className="text-primary font-bold">6. Informações Adicionais</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2 px-1">
                      <FormField name="nee" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Necessidades Especiais (NEE)</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} placeholder="Descreva se houver, ou deixe vazio" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Transporte Escolar</FormLabel>
                                <p className="text-xs text-muted-foreground">O aluno utiliza transporte da prefeitura?</p>
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
                                <FormLabel className="text-base">Carteira de Estudante</FormLabel>
                                <p className="text-xs text-muted-foreground">O aluno possui ou tem direito à carteira?</p>
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
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Descartar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Gravar Alterações
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
