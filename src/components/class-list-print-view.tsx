"use client";

import Image from "next/image";

interface ClassListPrintViewProps {
  students: any[];
  filters: {
    ensino: string;
    serie: string;
    turno: string;
    classe: string;
  };
}

// Este componente agora serve principalmente como uma pré-visualização no painel lateral
// A geração de PDF foi movida para o class-list-generator para maior controle e otimização.
export default function ClassListPrintView({ students, filters }: ClassListPrintViewProps) {
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

  return (
    <div className="bg-white text-black font-sans p-8" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
        <header className="flex flex-col items-center text-center text-xs font-bold mb-8">
            <div className="flex items-center gap-4 mb-4">
                <Image src="/logo.png" alt="Logo da Prefeitura de Fortaleza" width={80} height={80} unoptimized />
                <div className="h-10 border-l border-gray-400"></div>
                <span className="text-xl font-semibold">EDUCAÇÃO</span>
            </div>
            <p className="text-sm font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
            <p className="text-xs">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA | INEP: 23070188</p>
        </header>

        <div className="text-center my-8">
            <h1 className="text-xl font-bold uppercase tracking-wider">
                Lista de Alunos
            </h1>
            <p className="text-base font-semibold mt-2">
                {`${filters.ensino || ''} ${filters.serie || ''} ${filters.classe || ''} - Turno: ${filters.turno || ''}`}
            </p>
        </div>

        <main>
            <table className="w-full text-sm border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-2 w-12 text-center font-bold">Nº</th>
                        <th className="border border-gray-400 p-2 text-left font-bold">Nome do Aluno</th>
                        <th className="border border-gray-400 p-2 text-center font-bold">Data de Nascimento</th>
                        <th className="border border-gray-400 p-2 text-center font-bold">RM</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student, index) => (
                        <tr key={student.rm}>
                            <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                            <td className="border border-gray-400 p-2">{student.nome}</td>
                            <td className="border border-gray-400 p-2 text-center">{student.data_nascimento}</td>
                            <td className="border border-gray-400 p-2 text-center">{student.rm}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
        
        <footer className="text-center text-xs mt-12">
            <p>Gerado em: {formattedDate}</p>
        </footer>
    </div>
  );
}
