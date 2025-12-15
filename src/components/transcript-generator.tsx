

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { UserPlus, Search, Loader2, Edit, Download, X } from 'lucide-react';
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
    const [isEditing, setIsEditing] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingStudents(true);
            try {
                const alunosQuery = query(collection(firestore, 'alunos'));
                const alunosSnapshot = await getDocs(alunosQuery);
                const alunosData = alunosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setAllStudents(alunosData);

            } catch (error) {
                console.error("Error fetching students:", error);
                toast({ variant: 'destructive', title: 'Erro ao carregar dados' });
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
            ).slice(0, 5);
            setSearchResults(results);
        }
    }, [debouncedSearchTerm, allStudents]);

    const handleSelectStudent = (student: any) => {
        const studentWithData = JSON.parse(JSON.stringify(student));

        const anosSeriesTemplate = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];
        let trajectoryData = anosSeriesTemplate.map(serie => ({
            anoSerie: serie,
            anoCivil: '',
            estabelecimento: '',
            municipioUF: '',
            resultado: ''
        }));

        if (studentWithData.boletim) {
            Object.keys(studentWithData.boletim).forEach(yearStr => {
                const yearData = studentWithData.boletim[yearStr];
                if (yearData?.info?.serie) {
                    const rowIndex = anosSeriesTemplate.indexOf(yearData.info.serie);
                    if (rowIndex !== -1) {
                        trajectoryData[rowIndex].anoCivil = String(yearStr);
                        trajectoryData[rowIndex].estabelecimento = yearData.info.estabelecimento || 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES';
                        trajectoryData[rowIndex].municipioUF = yearData.info.municipioUF || 'Fortaleza/CE';
                        trajectoryData[rowIndex].resultado = yearData.info.resultado || 'Aprovado';
                    }
                }
            });
        }
        
        studentWithData.trajectoryData = trajectoryData;

        setSelectedStudent(studentWithData);
        setSearchTerm(student.nome);
        setSearchResults([]);
        setIsEditing(false);
    };

    const handleCreateNew = () => {
        const newStudentTemplate = {
            rm: `NOVO_HISTORICO_${Date.now()}`,
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
                estabelecimento: '',
                municipioUF: '',
                resultado: ''
            }))
        };
        setSelectedStudent(newStudentTemplate);
        setIsEditing(true);
        setSearchTerm('');
        setSearchResults([]);
    };
    
    const handleGeneratePDF = async () => {
        if (!selectedStudent) return;
    
        const wasEditing = isEditing;
        if (wasEditing) {
            setIsEditing(false);
            await new Promise(resolve => setTimeout(resolve, 100)); 
        }
    
        setIsGenerating(true);
    
        const transcriptElement = document.getElementById('transcript-page');
        const certificateElement = document.getElementById('certificate-page-wrapper');
    
        if (!transcriptElement) {
            toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: 'Template do histórico não encontrado.' });
            setIsGenerating(false);
            if (wasEditing) setIsEditing(true);
            return;
        }
    
        try {
            const transcriptCanvas = await html2canvas(transcriptElement, { scale: 2, useCORS: true });
            const transcriptImgData = transcriptCanvas.toDataURL('image/jpeg', 0.98);
            
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const transcriptImgProps = pdf.getImageProperties(transcriptImgData);
            const transcriptImgHeight = (transcriptImgProps.height * pdfWidth) / transcriptImgProps.width;
            
            pdf.addImage(transcriptImgData, 'JPEG', 0, 0, pdfWidth, transcriptImgHeight);
    
            if (certificateElement) {
                const certificateCanvas = await html2canvas(certificateElement, { scale: 2, useCORS: true });
                const certificateImgData = certificateCanvas.toDataURL('image/jpeg', 0.98);
                
                pdf.addPage('a4', 'l'); 
                const certPdfWidth = pdf.internal.pageSize.getWidth();
                const certPdfHeight = pdf.internal.pageSize.getHeight();

                pdf.addImage(certificateImgData, 'JPEG', 0, 0, certPdfWidth, certPdfHeight);
            }
    
            pdf.save(`Historico_Escolar_${selectedStudent.nome.replace(/\s+/g, '_')}.pdf`);
            
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: "destructive", title: "Erro ao Gerar PDF" });
        } finally {
            setIsGenerating(false);
            if (wasEditing) {
                setIsEditing(true);
            }
        }
    };
    

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gerador de Histórico Escolar</CardTitle>
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
                                <CardContent className="p-2 max-h-60 overflow-y-auto">
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
                                    <Button variant="outline" onClick={() => {
                                        setIsEditing(false);
                                        // If it's a new record, clear it. Otherwise, reload original.
                                        if (selectedStudent.rm.startsWith('NOVO_HISTORICO')) {
                                            setSelectedStudent(null);
                                        } else {
                                            handleSelectStudent(selectedStudent); // Reload original data
                                        }
                                    }}>
                                        <X className="mr-2 h-4 w-4" /> Cancelar Edição
                                    </Button>
                                ) : (
                                     <Button variant="secondary" onClick={() => setIsEditing(true)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar Histórico
                                    </Button>
                                )}
                                <Button onClick={handleGeneratePDF} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>}
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
