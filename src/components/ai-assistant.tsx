"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bot, User, CornerDownLeft, Loader2 } from "lucide-react";
import { knowledgeAssistant, type KnowledgeAssistantInput } from "@/ai/flows/knowledgeAssistant";


interface Message {
  role: "user" | "bot";
  text: string;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input || isLoading) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const assistantInput: KnowledgeAssistantInput = {
        history: messages.map(m => ({ role: m.role, content: [{ text: m.text }]})),
        prompt: input
      };
      
      const response = await knowledgeAssistant(assistantInput);

      if (response.reply) {
        const botMessage: Message = { role: "bot", text: response.reply };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error("A resposta da IA estava vazia.");
      }
    } catch (error) {
      console.error("Erro ao chamar a IA:", error);
      const errorMessage: Message = {
        role: "bot",
        text: "Desculpe, ocorreu um erro ao processar sua solicitação.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          className="fixed bottom-4 right-4 rounded-full w-16 h-16 shadow-lg z-50"
        >
          <Bot className="w-8 h-8" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[350px] sm:w-[400px] p-0 border-0 mr-4 mb-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Card className="flex flex-col h-[500px] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary flex items-center">
              <Bot className="mr-2" />
              Assistente Virtual
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-4 pr-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "justify-end" : ""
                    }`}
                  >
                    {message.role === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 text-sm max-w-[80%] break-words ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {message.text}
                    </div>
                     {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="rounded-lg p-3 bg-muted text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte-me qualquer coisa..."
                disabled={isLoading}
                className="flex-1"
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <CornerDownLeft className="w-5 h-5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
