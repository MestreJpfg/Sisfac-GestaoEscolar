

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
import { UserPlus, Search, Loader2, Edit, Save, X } from 'lucide-react';
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
    const [originalStudentData, setOriginalStudentData] = useState<any | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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
        const studentWithData = JSON.parse(JSON.stringify(student)); // Deep copy
        setSelectedStudent(studentWithData);
        setOriginalStudentData(studentWithData);
        setSearchTerm(student.nome);
        setSearchResults([]);
        setIsEditing(false);
    };

    const handleCreateNew = () => {
        const newStudentTemplate = {
            rm: `TEMPORARIO_${Date.now()}`,
            nome: '',
            data_nascimento: '',
            municipio_nascimento: 'FORTALEZA',
            uf_nascimento: 'CE',
            filiacao_1: '',
            filiacao_2: '',
            rg: '',
            boletim: {},
            trajectoryData: Array.from({ length: 9 }, (_, i) => ({
                anoSerie: `${i + 1}º ANO`,
                anoCivil: '',
                estabelecimento: 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES',
                municipioUF: 'Fortaleza/CE',
                resultado: 'Aprovado'
            }))
        };
        setSelectedStudent(newStudentTemplate);
        setOriginalStudentData(newStudentTemplate);
        setIsEditing(true);
        setSearchTerm('');
        setSearchResults([]);
    };
    
    const handleSaveChanges = () => {
        if (!firestore || !selectedStudent || !originalStudentData || originalStudentData.rm.startsWith('TEMPORARIO')) {
            toast({
                variant: 'destructive',
                title: 'Ação Inválida',
                description: 'Não é possível salvar um histórico temporário.'
            });
            return;
        }

        const studentDocRef = doc(firestore, 'alunos', selectedStudent.id);
        const { id, trajectoryData, ...dataToSave } = selectedStudent;
        
        // Save trajectory data inside boletim info for persistence
        if (trajectoryData) {
            trajectoryData.forEach((row: any) => {
                if (row.anoCivil && dataToSave.boletim[row.anoCivil]) {
                    if (!dataToSave.boletim[row.anoCivil].info) {
                        dataToSave.boletim[row.anoCivil].info = {};
                    }
                    dataToSave.boletim[row.anoCivil].info.estabelecimento = row.estabelecimento;
                    dataToSave.boletim[row.anoCivil].info.municipioUF = row.municipioUF;
                    dataToSave.boletim[row.anoCivil].info.resultado = row.resultado;
                }
            });
        }
        
        setDocumentNonBlocking(studentDocRef, dataToSave, { merge: true });

        toast({
            title: "Histórico Atualizado",
            description: "As informações do histórico foram salvas com sucesso.",
        });
        
        // Update local state to reflect saved changes
        setAllStudents(prev => prev.map(s => s.id === selectedStudent.id ? selectedStudent : s));
        setOriginalStudentData(selectedStudent);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        if (originalStudentData?.rm.startsWith('TEMPORARIO')) {
            setSelectedStudent(null);
            setOriginalStudentData(null);
        } else {
            setSelectedStudent(originalStudentData);
        }
        setIsEditing(false);
    }

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
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <CardTitle>Pré-visualização do Histórico</CardTitle>
                                <CardDescription>Aluno: {selectedStudent.nome || "Novo Histórico"}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="outline" onClick={handleCancelEdit}>
                                            <X className="mr-2 h-4 w-4" /> Cancelar
                                        </Button>
                                        {!selectedStudent.rm.startsWith('TEMPORARIO_') && (
                                            <Button onClick={handleSaveChanges}>
                                                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                     <Button variant="secondary" onClick={() => setIsEditing(true)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar Histórico
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
                                    isEditing={isEditing}
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
