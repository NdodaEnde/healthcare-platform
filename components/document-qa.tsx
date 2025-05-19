"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface DocumentQAProps {
  documentId: string;
  onAnswerReceived?: (answer: any) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  evidence?: any;
}

export function DocumentQA({ documentId, onAnswerReceived }: DocumentQAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    // Add user question to messages
    const userMessage: Message = {
      role: "user",
      content: question
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/documents/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentId,
          question: question.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get answer");
      }
      
      const data = await response.json();
      
      // Add assistant response to messages
      const assistantMessage: Message = {
        role: "assistant",
        content: data.data.answer,
        evidence: data.data.best_chunks
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Notify parent component if needed
      if (onAnswerReceived) {
        onAnswerReceived(data.data);
      }
      
      // Clear the question input
      setQuestion("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get an answer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ask Questions About This Document</CardTitle>
      </CardHeader>
      <CardContent className="p-4 max-h-[400px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            Ask a question about this document to get started
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{message.content}</p>
                  {message.evidence && (
                    <div className="mt-2 text-xs opacity-80">
                      <p className="font-medium">Supporting evidence:</p>
                      {message.evidence.map((chunk: any, i: number) => (
                        <p key={i} className="mt-1">
                          &ldquo;{chunk.text.slice(0, 100)}...&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <form onSubmit={handleQuestionSubmit} className="w-full flex gap-2">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 min-h-[60px] max-h-[120px]"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !question.trim()}>
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}