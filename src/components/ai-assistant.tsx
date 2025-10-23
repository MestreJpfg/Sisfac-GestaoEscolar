'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, Loader, Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { assistantFlow, type AssistantInput } from '@/ai/flows/assistant-flow';
import type { Message } from 'genkit';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface AiAssistantProps {
  onClose: () => void;
}

/**
 * A client-side component that provides a chat interface for the AI assistant.
 * It manages conversation history, user input, and communication with the
 * Genkit assistant flow.
 */
export default function AiAssistant({ onClose }: AiAssistantProps) {
  const [history, setHistory] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom of the message list when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  // Handle the submission of a user's query
  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: [{ text: query }],
    };

    // Add user message to history and clear input
    setHistory((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const input: AssistantInput = {
        history: [...history, userMessage],
        query,
      };

      // Call the server-side Genkit flow
      const { response } = await assistantFlow(input);

      const modelMessage: Message = {
        role: 'model',
        content: [{ text: response }],
      };
      setHistory((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error calling assistant flow:', error);
      const errorMessage: Message = {
        role: 'model',
        content: [{ text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' }],
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [query, history, isLoading]);

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
            <h3 className="text-lg font-semibold text-primary-foreground">Assistente Virtual</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Message Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {history.map((msg, index) => (
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
                  {msg.content[0].text}
                </div>
              </div>
            ))}
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
            placeholder="Pergunte-me qualquer coisa sobre os alunos..."
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
