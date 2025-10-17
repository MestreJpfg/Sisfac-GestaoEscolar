"use client";

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { studentDataAssistant } from '@/ai/flows/studentDataAssistant';
import { type DataItem } from './data-viewer';
import { Card, CardContent } from './ui/card';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  studentData: DataItem[];
}

export default function AiAssistant({ isOpen, onClose, studentData }: AiAssistantProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast({
        variant: 'destructive',
        title: 'Pergunta vazia',
        description: 'Por favor, digite uma pergunta para a IA.',
      });
      return;
    }

    setIsLoading(true);
    setResponse('');

    try {
      const result = await studentDataAssistant({ query, studentData });
      setResponse(result);
    } catch (error) {
      console.error('AI assistant error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro da IA',
        description: 'Ocorreu um erro ao processar sua pergunta. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Assistente IA
          </SheetTitle>
          <SheetDescription>
            Faça perguntas sobre os dados dos alunos e a IA irá responder.
            Ex: "Quais alunos fazem aniversário hoje?" ou "Qual a matrícula do aluno João Silva?"
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="query">Sua Pergunta</Label>
            <Textarea
              id="query"
              placeholder="Digite sua pergunta aqui..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center rounded-md border border-dashed p-8">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Analisando dados...</span>
            </div>
          )}
          
          {response && !isLoading && (
             <Card>
                <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap">{response}</p>
                </CardContent>
            </Card>
          )}

        </div>
        <SheetFooter>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Perguntar à IA
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
