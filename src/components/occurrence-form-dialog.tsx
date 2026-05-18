
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { User, Calendar as CalendarIcon, Clock, Users, ShieldAlert, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const occurrenceSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno."),
  studentName: z.string(),
  studentClass: z.string(),
  type: z.string().min(1, "Selecione o tipo de ocorrência."),
  date: z.string().min(1, "A data é obrigatória."),
  time: z.string().min(1, "A hora é obrigatória."),
  description: z.string().min(10, "Descreva detalhadamente o ocorrido (mínimo 10 caracteres)."),
  reportedBy: z.string().min(1, "Identifique quem está relatando."),
  involvedStudents: z.string().optional().nullable(),
  penalty: z.string().min(1, "Selecione a penalidade aplicada ou prevista."),
  status: z.string().min(1, "Selecione o status atual."),
});

type OccurrenceFormValues = z.infer<typeof occurrenceSchema>;

interface OccurrenceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  occurrence: any | null;
  students: any[];
}

export default function OccurrenceFormDialog({ isOpen, onClose, onSave, occurrence, students }: OccurrenceFormDialogProps) {
    const { toast } = useToast();
    const [searchStudent, setSearchStudent] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    const form = useForm<OccurrenceFormValues>({
        resolver: zodResolver(occurrenceSchema),
        defaultValues: {
            type: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
            description: '',
            reportedBy: '',
            involvedStudents: '',
            penalty: 'Nenhuma',
            status: 'Ativa',
        }
    });

    useEffect(() => {
        if (occurrence) {
            const dateObj = new Date(occurrence.date);
            form.reset({
                ...occurrence,
                date: format(dateObj, 'yyyy-MM-dd'),
                time: format(dateObj, 'HH:mm'),
                involvedStudents: occurrence.involvedStudents?.join(', ') || '',
            });
            setSelectedStudent({ id: occurrence.studentId, nome: occurrence.studentName, serie: '', classe: '' });
        }
    }, [occurrence, form]);

    const studentSuggestions = useMemo(() => {
        if (searchStudent.length < 3) return [];
        const lower = searchStudent.toLowerCase();
        return students.filter(s => s.nome?.toLowerCase().includes(lower)).slice(0, 5);
    }, [students, searchStudent]);

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        form.setValue('studentId', student.id);
        form.setValue('studentName', student.nome);
        form.setValue('studentClass', `${student.serie || ''} ${student.classe || ''}`.trim());
        setSearchStudent('');
    };

    const onSubmit = (values: OccurrenceFormValues) => {
        const fullDate = new Date(`${values.date}T${values.time}`).toISOString();
        const finalData = {
            ...values,
            date: fullDate,
            involvedStudents: values.involvedStudents ? values.involvedStudents.split(',').map(s => s.trim()) : [],
            id: occurrence?.id
        };
        // @ts-ignore
        delete finalData.time;
        onSave(finalData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="text-primary h-5 w-5" />
                        {occurrence ? 'Editar Registro de Ocorrência' : 'Novo Registro de Ocorrência'}
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes do evento disciplinar ou administrativo.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 space-y-4">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-6 py-2">
                                {/* Busca de Aluno */}
                                <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4" /> Identificação do Aluno
                                    </h3>
                                    {!selectedStudent ? (
                                        <div className="relative">
                                            <Input 
                                                placeholder="Comece a digitar o nome do aluno (mínimo 3 letras)..." 
                                                value={searchStudent}
                                                onChange={(e) => setSearchStudent(e.target.value)}
                                            />
                                            {studentSuggestions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
                                                    {studentSuggestions.map(s => (
                                                        <div 
                                                            key={s.id} 
                                                            className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                                            onMouseDown={() => handleSelectStudent(s)}
                                                        >
                                                            {s.nome} - <span className="text-muted-foreground">{s.serie} {s.classe}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-2 bg-background border rounded-md">
                                            <div>
                                                <p className="font-bold text-sm">{selectedStudent.nome}</p>
                                                <p className="text-xs text-muted-foreground">{form.getValues('studentClass')}</p>
                                            </div>
                                            {!occurrence && (
                                                <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(null); form.setValue('studentId', ''); }}>
                                                    Alterar
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    <FormField name="studentId" control={form.control} render={() => <FormMessage />} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Ocorrência</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Indisciplina">Indisciplina</SelectItem>
                                                        <SelectItem value="Atraso">Atraso</SelectItem>
                                                        <SelectItem value="Briga">Briga / Conflito</SelectItem>
                                                        <SelectItem value="Ofensa">Ofensa Verbal</SelectItem>
                                                        <SelectItem value="Falta">Falta Grave</SelectItem>
                                                        <SelectItem value="Uso de Celular">Uso Indevido de Celular</SelectItem>
                                                        <SelectItem value="Outros">Outros</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reportedBy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Relatado por (Professor/Funcionário)</FormLabel>
                                                <FormControl><Input {...field} placeholder="Ex: Prof. Silva" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data do Ocorrido</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="time"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Hora aproximada</FormLabel>
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição Detalhada</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    {...field} 
                                                    placeholder="Descreva o que aconteceu, o contexto e as ações tomadas no momento..." 
                                                    className="min-h-[120px]"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="involvedStudents"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Outros Alunos Envolvidos (Opcional)</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ''} placeholder="Ex: Aluno X, Aluna Y..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="penalty"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Medida / Penalidade</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Nenhuma">Nenhuma / Apenas Registro</SelectItem>
                                                        <SelectItem value="Advertência Verbal">Advertência Verbal</SelectItem>
                                                        <SelectItem value="Advertência Escrita">Advertência Escrita</SelectItem>
                                                        <SelectItem value="Convocação de Responsáveis">Convocação de Responsáveis</SelectItem>
                                                        <SelectItem value="Suspensão">Suspensão</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status do Caso</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Ativa">Ativa (Pendente)</SelectItem>
                                                        <SelectItem value="Em Análise">Em Análise / Coordenação</SelectItem>
                                                        <SelectItem value="Resolvida">Resolvida</SelectItem>
                                                        <SelectItem value="Arquivada">Arquivada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">
                                {occurrence ? 'Salvar Alterações' : 'Registrar Ocorrência'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
