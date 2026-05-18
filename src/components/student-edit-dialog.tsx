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

  useEffect(() => {
    if (student && isOpen) {
        const address = parseAddress(student.endereco);
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
            if (typeof value === 'string' && !['id', 'rm', 'email'].includes(key)) {
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
          <DialogDescription>Atualize os dados cadastrais do aluno.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
             <ScrollArea className="flex-1 pr-6 -mr-6">
                <Accordion type="multiple" defaultValue={["personal", "academic"]} className="w-full">
                  <AccordionItem value="personal">
                    <AccordionTrigger className="text-primary font-bold">1. Identificação e Contato</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField name="rm" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>RM</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <FormField name="data_nascimento" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Nascimento</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                      </div>
                       <FormField name="telefones" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefones (vírgula)</FormLabel>
                          <FormControl><Input {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} /></FormControl>
                        </FormItem>
                       )} />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="address">
                    <AccordionTrigger className="text-primary font-bold">2. Localização</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-2 gap-4 pt-2">
                        <FormField name="endereco_cep" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} onChange={e => { field.onChange(e.target.value); handleCepChange(e.target.value); }} /></FormControl></FormItem>
                        )} />
                        <FormField name="endereco_bairro" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField name="endereco_rua" control={form.control} render={({ field }) => (
                            <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="academic">
                    <AccordionTrigger className="text-primary font-bold">3. Vínculo Académico</AccordionTrigger>
                    <AccordionContent className="grid grid-cols-2 gap-4 pt-2">
                       <FormField name="ensino" control={form.control} render={({ field }) => (<FormItem><FormLabel>Ensino</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                       <FormField name="serie" control={form.control} render={({ field }) => (<FormItem><FormLabel>Série</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                       <FormField name="classe" control={form.control} render={({ field }) => (<FormItem><FormLabel>Classe</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                       <FormField name="turno" control={form.control} render={({ field }) => (<FormItem><FormLabel>Turno</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
             </ScrollArea>
             <DialogFooter className="pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
