

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { UserPlus, Search, Loader2, Save } from 'lucide-react';
import TranscriptPDFTemplate from './transcript-pdf-template';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TranscriptGenerator() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isNewTranscript, setIsNewTranscript] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingStudents(true);
            try {
                const q = query(collection(firestore, 'alunos'));
                const snapshot = await getDocs(q);
                const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students:", error);
                toast({ variant: 'destructive', title: 'Erro ao carregar alunos' });
            } finally {
                setIsLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);

    useEffect(() => {
        if (debouncedSearchTerm.length < 3) {
            setSearchResults([]);
            return;
        }
        if (allStudents.length > 0) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            const results = allStudents.filter(student =>
                student.nome?.toLowerCase().includes(lowercasedTerm)
            ).slice(0, 5); // Limit results for performance
            setSearchResults(results);
        }
    }, [debouncedSearchTerm, allStudents]);

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setSearchTerm(student.nome);
        setSearchResults([]);
        setIsNewTranscript(false);
    };

    const handleCreateNew = () => {
        const newRM = `HISTORICO_${Date.now()}`;
        setSelectedStudent({
            id: newRM,
            rm: newRM,
            nome: '',
            data_nascimento: '',
            filiacao_1: '',
            filiacao_2: '',
            rg: '',
            boletim: {},
        });
        setIsNewTranscript(true);
        setSearchTerm('');
        setSearchResults([]);
    };
    
    const handleSaveTranscript = () => {
        if (!firestore || !selectedStudent?.rm) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o histórico.' });
            return;
        }
        
        const docRef = doc(firestore, 'alunos', selectedStudent.rm);
        
        // Remove a flag de edição antes de salvar
        const { isEditing, ...dataToSave } = selectedStudent;
        
        setDocumentNonBlocking(docRef, dataToSave, { merge: true });

        toast({
            title: 'Histórico Salvo!',
            description: 'As alterações no histórico foram salvas com sucesso.',
        });
        
        // Atualiza a lista de alunos localmente
        setAllStudents(prev => {
            const studentExists = prev.some(s => s.id === selectedStudent.id);
            if(studentExists) {
                return prev.map(s => s.id === selectedStudent.id ? dataToSave : s);
            }
            return [...prev, dataToSave];
        });

        setIsNewTranscript(false); // Sai do modo de criação/edição
    };

    const handleGeneratePDF = async () => {
        if (!selectedStudent) return;
        setIsGenerating(true);

        const element = document.getElementById('pdf-template-container');
        if (!element) {
            toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Template não encontrado.' });
            setIsGenerating(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Historico_Escolar_${selectedStudent.nome.replace(/\s+/g, '_')}.pdf`);
            
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: "destructive", title: "Erro ao Gerar PDF" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gerar Histórico Escolar</CardTitle>
                    <CardDescription>
                        Pesquise por um aluno para gerar o seu histórico escolar completo ou crie um novo do zero.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar por nome do aluno..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoadingStudents}
                        />
                        {isLoadingStudents && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                        {searchResults.length > 0 && (
                            <Card className="absolute z-10 w-full mt-1">
                                <CardContent className="p-2">
                                    {searchResults.map(s => (
                                        <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-2 hover:bg-accent rounded-md cursor-pointer">
                                            <p className="font-medium">{s.nome}</p>
                                            <p className="text-sm text-muted-foreground">{s.serie} {s.classe} - {s.turno}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <Button variant="outline" onClick={handleCreateNew}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Criar Novo
                    </Button>
                </CardContent>
            </Card>

            {selectedStudent && (
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Pré-visualização do Histórico</CardTitle>
                                <CardDescription>Aluno: {selectedStudent.nome || "Novo Histórico"}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {isNewTranscript && (
                                     <Button onClick={handleSaveTranscript}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Histórico
                                    </Button>
                                )}
                                <Button onClick={handleGeneratePDF} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4"/>}
                                    Gerar PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md p-4 bg-gray-200 overflow-auto">
                           <div id="pdf-template-container" className="mx-auto">
                                <TranscriptPDFTemplate 
                                    student={selectedStudent} 
                                    isEditing={isNewTranscript}
                                    onStudentChange={setSelectedStudent}
                                />
                           </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
