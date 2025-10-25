
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, Loader, Bot, X, User, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { assistantFlow } from '@/ai/flows/assistant-flow';
import type { AssistantInput } from '@/ai/flows/assistant-schema';
import type { Message } from 'genkit';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface AiAssistantProps {
  onClose: () => void;
  onRequestEditStudent: (studentId: string) => void;
  onRequestGenerateDeclaration: (studentId: string) => void;
  onRequestCreateList: () => void;
}

type ActionType = 'edit' | 'declaration' | 'list' | null;


const initialMessage: Message = {
    role: 'model',
    content: [{ text: "Olá! Eu sou a FernandIA. 👋\n\nSelecione uma das opções abaixo para começar." }],
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
  const [currentAction, setCurrentAction] = useState<ActionType>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);
  
  useEffect(() => {
    // Focus the input when the assistant is waiting for text input
    if (currentAction && currentAction !== 'list' && !isLoading && inputRef.current) {
        inputRef.current.focus();
    }
  }, [currentAction, isLoading])


  const handleToolResponse = useCallback((toolName: string, studentId?: string) => {
    // This function is now responsible for triggering actions in the main UI
    // and closing the assistant.
    setTimeout(() => {
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
        onClose(); // Close the assistant after the action is requested
    }, 1000); // A small delay to let the user read the final AI message
  }, [onRequestEditStudent, onRequestGenerateDeclaration, onRequestCreateList, onClose]);


  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: [{ text: query }] };
    let flowInput: AssistantInput;

    if (currentAction && currentAction !== 'list') {
      // Step 2: User provides a name. Create a contextualized query for the AI.
      const actionPrefix = currentAction === 'edit' 
          ? 'Encontrar aluno para editar: ' 
          : 'Encontrar aluno para gerar declaração: ';
      
      const contextualizedQuery = actionPrefix + query;
      const contextualizedMessage: Message = { role: 'user', content: [{ text: contextualizedQuery }]};
      
      // Send the history UP TO the point before the user typed the name, plus the new contextualized query.
      // This avoids sending the raw name, which could confuse the AI.
      flowInput = { history: [...history.slice(0, -1), contextualizedMessage]};

    } else {
       // This handles cases where the user might continue a conversation after an initial response
      flowInput = { history: [...history, userMessage] };
    }

    setHistory(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
        const response: Message = await assistantFlow(flowInput);
        
        setHistory(prev => [...prev, response]);

        const toolRequestPart = response.content.find(part => part.toolRequest);
        if (toolRequestPart && toolRequestPart.toolRequest) {
            const toolRequest = toolRequestPart.toolRequest;
            handleToolResponse(toolRequest.name, toolRequest.input.studentId);
        }

    } catch (error) {
      console.error('Error calling assistant flow:', error);
      const errorMessage: Message = {
        role: 'model',
        content: [{ text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' }],
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // If the flow didn't result in an action, reset the currentAction to show buttons again.
      // We check if a tool was requested in the last message. If not, reset.
      const lastMessage = history[history.length-1];
      const toolRequested = lastMessage?.content.some(c => c.toolRequest);
      if(!toolRequested) {
        setCurrentAction(null);
      }
    }
  };

  const handleActionSelect = (action: ActionType) => {
    setCurrentAction(action);
    let messageText = '';

    if (action === 'list') {
        const userMessage: Message = { role: 'user', content: [{text: "Criar uma lista de alunos"}] };
        const modelResponse: Message = { role: 'model', content: [{text: "Ok, a abrir o gerador de listas..."}] };
        setHistory(prev => [...prev, userMessage, modelResponse]);
        handleToolResponse('requestCreateList');
        return;
    }
    
    if (action === 'edit') {
        messageText = 'Ótimo! Qual o nome do aluno que deseja editar?';
    } else if (action === 'declaration') {
        messageText = 'Perfeito. Qual o nome do aluno para gerar a declaração?';
    }
    
    setHistory(prev => [...prev, { role: 'model', content: [{ text: messageText }] }]);
  };
  
  
  const renderInputArea = () => {
    if (isLoading) {
        return null; // Don't show any input while loading
    }
    
    // If an action has been selected that requires text input (edit/declaration)
    if (currentAction && currentAction !== 'list') {
        return (
            <div className="p-4 border-t relative">
              <Textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do aluno..."
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
        )
    }

    // Initial state: show action buttons
    return (
        <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => handleActionSelect('edit')}>
                <User className="mr-2 h-4 w-4"/>
                Editar Aluno
            </Button>
            <Button variant="outline" onClick={() => handleActionSelect('declaration')}>
                <FileText className="mr-2 h-4 w-4"/>
                Gerar Declaração
            </Button>
            <Button variant="outline" onClick={() => handleActionSelect('list')}>
                <List className="mr-2 h-4 w-4"/>
                Criar Lista
            </Button>
        </div>
    )
  }

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
                .map(c => c.text)
                .filter(Boolean)
                .join('\n');
                
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
        {renderInputArea()}
      </motion.div>
    </AnimatePresence>
  );
}
