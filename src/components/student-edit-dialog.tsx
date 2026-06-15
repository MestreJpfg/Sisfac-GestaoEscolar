
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
import { Loader2, Save, User, MapPin, GraduationCap, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";

const studentSchema = z.record(z.any());

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSave: (data: any) => void;
}

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
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {},
  });

  const formatBirthDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
      .substring(0, 10);
  };

  useEffect(() => {
    if (student && isOpen) {
        const address = parseAddress(student.endereco);
        const defaultVals = {
            ...student,
            rm: String(student.rm || ''),
            nome: student.nome || '',
            rg: student.rg || '',
            nis: student.nis || '',
            id_censo: student.id_censo || '',
            cpf_aluno: student.cpf_aluno || '',
            filiacao_1: student.filiacao_1 || '',
            filiacao_2: student.filiacao_2 || '',
            cpffiliacao1: student.cpffiliacao1 || '',
            nee: student.nee || '',
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
      if (!data.erro) {
        form.setValue('endereco_rua', data.logradouro, { shouldValidate: true });
        form.setValue('endereco_bairro', data.bairro, { shouldValidate: true });
      }
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
        
        let enderecoCompleto = '';
        if (endereco_cep || endereco_rua || endereco_numero || endereco_bairro) {
          enderecoCompleto = `(${endereco_cep || ''}) - ${endereco_rua || ''} - ${endereco_numero || ''} - ${endereco_bairro || ''}`;
        }

        const processedData: any = {};
        for (const key in restOfData) {
            const value = restOfData[key];
            if (typeof value === 'string' && !['id', 'rm', 'email', 'status', 'data_nascimento'].includes(key)) {
                processedData[key] = value.toUpperCase();
            } else if (value === '') {
                processedData[key] = null;
            } else {
                processedData[key] = value;
            }
        }

        const finalData = {
            ...student, 
            ...processedData,
            endereco: enderecoCompleto.toUpperCase() || null,
        };
        
        await onSave(finalData);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        toast({ variant: "destructive", title: "Erro ao Salvar" });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Ficha do Aluno</DialogTitle>
          <DialogDescription>Atualize todos os dados cadastrais do aluno abaixo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 space-y-4">
             <ScrollArea className="flex-1 pr-6 -mr-6">
                <Accordion type="multiple" defaultValue={["personal"]} className="w-full">
                  
                  <AccordionItem value="personal">
                    <AccordionTrigger className="text-primary font-bold hover:no-underline">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>1. Identificação e Documentos</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                      )} />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="rm" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>RM (Registro do Aluno)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="data_nascimento" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Data de Nascimento</FormLabel>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        onChange={(e) => field.onChange(formatBirthDate(e.target.value))}
                                        placeholder="DD/MM/AAAA" 
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField name="rg" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="cpf_aluno" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>CPF do Aluno</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="nis" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>NIS</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="id_censo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>ID Censo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                      </div>
                      
                      <FormField name="telefones" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefones (separados por vírgula)</FormLabel>
                          <FormControl><Input {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} /></FormControl>
                        </FormItem>
                      )} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="address">
                    <AccordionTrigger className="text-primary font-bold hover:no-underline">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>2. Localização e Endereço</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <FormField name="endereco_cep" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <div className="relative">
                                    <FormControl><Input {...field} onChange={e => { field.onChange(e.target.value); handleCepChange(e.target.value); }} /></FormControl>
                                    {isCepLoading && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                            </FormItem>
                        )} />
                        <FormField name="endereco_bairro" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="endereco_rua" control={form.control} render={({ field }) => (
                            <FormItem className="sm:col-span-2"><FormLabel>Logradouro / Rua</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="endereco_numero" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Número / Complemento</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="academic">
                    <AccordionTrigger className="text-primary font-bold hover:no-underline">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>3. Vínculo Académico</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                       <FormField name="ensino" control={form.control} render={({ field }) => (<FormItem><FormLabel>Ensino</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                       <FormField name="serie" control={form.control} render={({ field }) => (<FormItem><FormLabel>Série / Ano</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                       <FormField name="classe" control={form.control} render={({ field }) => (<FormItem><FormLabel>Classe / Turma</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                       <FormField name="turno" control={form.control} render={({ field }) => (<FormItem><FormLabel>Turno</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="family">
                    <AccordionTrigger className="text-primary font-bold hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>4. Família e Filiação</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <FormField name="filiacao_1" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Filiação 1 (Mãe/Responsável)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="cpffiliacao1" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>CPF da Filiação 1</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="filiacao_2" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Filiação 2 (Pai/Responsável)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="others">
                    <AccordionTrigger className="text-primary font-bold hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            <span>5. Necessidades e Benefícios</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                        <FormField name="nee" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>NEE (Necessidade Educacional Especial)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Ex: Autismo, Deficiência Visual..." /></FormControl></FormItem>
                        )} />
                        
                        <div className="flex flex-col gap-4">
                            <FormField name="transporte_escolar" control={form.control} render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Utiliza Transporte Escolar?</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
                            
                            <FormField name="carteira_estudante" control={form.control} render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Possui Carteira de Estudante?</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
             </ScrollArea>

             <DialogFooter className="pt-6 border-t mt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
