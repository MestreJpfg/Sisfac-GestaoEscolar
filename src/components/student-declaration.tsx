"use client";

import Image from "next/image";

interface StudentDeclarationProps {
    student: any | null;
}

export default function StudentDeclaration({ student }: StudentDeclarationProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    return (
        <div id={`declaration-${student.rm}`} className="bg-white text-black p-10 font-serif" style={{ width: '210mm', height: '297mm' }}>
            <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <header className="flex items-center justify-between pb-8 border-b-2 border-gray-200">
                    <div className="flex items-center gap-4">
                        <Image src="/logoyuri.png" alt="Logo da Escola" width={100} height={33} />
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-bold">ESCOLA ESTADUAL YURI GAGARIN</p>
                        <p>Endereço da Escola, Nº, Bairro</p>
                        <p>Cidade, Estado - CEP</p>
                        <p>Telefone: (XX) XXXX-XXXX</p>
                    </div>
                </header>
                
                {/* Título da Declaração */}
                <div className="text-center my-16">
                    <h1 className="text-3xl font-bold tracking-wider uppercase">DECLARAÇÃO</h1>
                </div>

                {/* Corpo da Declaração */}
                <main className="text-lg leading-relaxed text-justify flex-grow">
                    <p className="mb-6 indent-8">
                        Declaramos, para os devidos fins, que <strong className="font-bold">{student.nome || 'N/A'}</strong>, 
                        nascido(a) em {student.data_nascimento || 'N/A'}, filho(a) de {student.filiacao_1 || 'N/A'}, 
                        portador(a) do RG nº {student.rg || 'N/A'}, inscrito(a) no CPF sob o nº {student.cpf_aluno || 'N/A'}, 
                        está regularmente matriculado(a) nesta instituição de ensino no ano letivo de {today.getFullYear()}.
                    </p>
                    <p className="mb-6 indent-8">
                        O(A) referido(a) aluno(a) está cursando a <strong className="font-bold">{student.serie || 'N/A'}</strong> do 
                        <strong className="font-bold"> {student.ensino || 'N/A'}</strong>, na classe <strong className="font-bold">{student.classe || 'N/A'}</strong>, 
                        no turno da <strong className="font-bold">{student.turno || 'N/A'}</strong>, sob o Registro do Aluno (RM) 
                        nº <strong className="font-bold">{student.rm || 'N/A'}</strong>.
                    </p>
                    {student.nee && (
                         <p className="mb-6 indent-8">
                            Consta em nossos registros que o(a) aluno(a) possui a seguinte necessidade educacional especial: <strong className="font-bold">{student.nee}</strong>.
                        </p>
                    )}
                     <p className="mt-12">
                        Por ser expressão da verdade, firmamos a presente declaração.
                    </p>
                </main>

                {/* Data e Assinatura */}
                <footer className="pt-16 text-center">
                    <p className="mb-16">{`Cidade, ${formattedDate}.`}</p>
                    <div className="w-64 mx-auto">
                        <div className="border-t border-gray-400 pt-2">
                            <p className="font-bold">Direção da Escola</p>
                            <p className="text-sm">Assinatura Autorizada</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
