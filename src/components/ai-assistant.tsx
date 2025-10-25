'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, Loader, Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { assistantFlow } from '@/ai/flows/assistant-flow';
import type { AssistantInput } from '@/ai/flows/assistant-schema';
import type { Message } from 'genkit';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

type ToolCall = {
    name: string;
    input: any;
};

type ToolRequestPart = {
    toolRequest: ToolCall;
};

interface AiAssistantProps {
  onClose: () => void;
  onRequestEditStudent: (studentId: string) => void;
  onRequestGenerateDeclaration: (studentId:string) => void;
  onRequestCreateList: () => void;
}

const initialMessage: Message = {
    role: 'model',
    content: [{ text: "Olá! Eu sou a FernandIA, a sua assistente virtual.\n\nComo posso ajudar hoje? Você pode me pedir para:\n- Editar os dados de um aluno\n- Gerar uma declaração de matrícula\n- Criar uma lista de alunos por série" }],
};

export default function AiAssistant({ 
    onClose,
    onRequestEditStudent,
    onRequestGenerateDeclaration,
    onRequestCreateList,
 }: AiAssistantProps) {
  const [history, setHistory] = useState<Message[]>([initialMessage]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  const handleToolResponse = (toolName: string, studentId?: string) => {
    switch (toolName) {
        case 'requestEditStudent':
            if(studentId) onRequestEditStudent(studentId);
            break;
        case 'requestGenerateDeclaration':
            if(studentId) onRequestGenerateDeclaration(studentId);
            break;
        case 'requestCreateList':
            onRequestCreateList();
            break;
        default:
            console.warn(`Unknown tool requested by AI: ${toolName}`);
    }
    // Close the assistant after executing an action
    onClose();
  };

  const processFlow = useCallback(async (currentHistory: Message[]) => {
    setIsLoading(true);
    try {
        const input: AssistantInput = { history: currentHistory };
        const response = await assistantFlow(input);
        
        const modelResponseContent = response.content;
        const modelMessage: Message = {
            role: 'model',
            content: modelResponseContent,
        };
        
        const toolRequests = modelResponseContent.filter((part: any) => part.toolRequest);

        if (toolRequests.length > 0) {
            // Add the model's request to the history
            setHistory(prev => [...prev, modelMessage]);

            const toolRequest = toolRequests[0].toolRequest;
            const toolName = toolRequest.name;
            const toolInput = toolRequest.input;
            
            // This is a special case where the AI calls a "request" tool.
            // These tools are instructions for the UI, not data-fetching tools.
            if (toolName.startsWith('request')) {
                handleToolResponse(toolName, toolInput.studentId);
                // Stop loading as the UI action is the final step
                setIsLoading(false);
                return;
            }

            // For data-fetching tools, we need another round trip
            const toolResponseMessage: Message = {
                role: 'tool',
                content: [{
                    toolResponse: {
                        name: toolName,
                        output: toolRequest.output // The flow now directly returns the tool output
                    }
                }]
            };

            // This recursive call is not ideal for React state updates.
            // A better approach would be a state machine or effect-driven flow.
            // For now, let's just re-run the process with the tool response.
            // This will likely cause a flicker but is a simpler implementation.
            processFlow([...currentHistory, modelMessage, toolResponseMessage]);

        } else {
            // It's a standard text response
            setHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
        }

    } catch (error) {
      console.error('Error calling assistant flow:', error);
      const errorMessage: Message = {
        role: 'model',
        content: [{ text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' }],
      };
      setHistory((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  }, [onRequestEditStudent, onRequestGenerateDeclaration, onRequestCreateList, onClose]);


  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isLoading) return;
    
    const userMessage: Message = { role: 'user', content: [{ text: query }] };
    const newHistory = [...history, userMessage];

    setHistory(newHistory);
    setQuery('');
    
    processFlow(newHistory);

  }, [query, history, isLoading, processFlow]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-lg h-[70vh] max-h-[600px] flex flex-col bg-card/80 backdrop-blur-lg rounded-2xl shadow-2xl border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-primary-foreground">FernandIA</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Message Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {history.map((msg, index) => {
              const textContent = msg.content
                .filter(c => c.text)
                .map(c => c.text)
                .join('\n');
                
              // Don't render tool requests/responses in the chat UI
              if (!textContent && !isLoading && index === history.length -1) return null;
              if (!textContent) return null;

              return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'model' && <Bot className="w-5 h-5 text-primary shrink-0 mt-1" />}
                <div
                  className={cn(
                    'max-w-xs md:max-w-md p-3 rounded-xl whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                  )}
                >
                  {textContent}
                </div>
              </div>
              )
            })}
            {isLoading && (
              <div className="flex justify-start items-center gap-3">
                 <Bot className="w-5 h-5 text-primary shrink-0 mt-1" />
                 <div className="bg-muted/50 p-3 rounded-xl flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground text-sm italic">A pensar...</span>
                 </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t relative">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Peça para editar, gerar ou listar..."
            className="w-full pr-12 resize-none bg-background/80"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="absolute bottom-6 right-6"
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
          >
            <CornerDownLeft className="w-5 h-5" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
