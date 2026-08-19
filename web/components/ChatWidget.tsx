"use client";

import * as React from "react";
import { Send, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getChatHistory, type Message } from "@/lib/api/messages";
import { getTrackingSocket, CHAT_SEND_MESSAGE_EVENT, CHAT_RECEIVE_MESSAGE_EVENT } from "@/lib/socket";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  targetUserId: string;
  targetUserName: string;
  isActive: boolean; // if false, input is hidden and a message says pickup is complete
  className?: string;
}

export function ChatWidget({ targetUserId, targetUserName, isActive, className }: ChatWidgetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (!user) return;
    
    // Fetch initial history
    getChatHistory(targetUserId)
      .then(res => {
        setMessages(res.messages);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch chat history:", err);
        setLoading(false);
      });
      
    // Socket real-time listener
    const socket = getTrackingSocket();
    
    const onReceiveMessage = (msg: Message) => {
      if (msg.senderId === targetUserId || msg.receiverId === targetUserId) {
        setMessages(prev => [...prev, msg]);
      }
    };
    
    socket.on(CHAT_RECEIVE_MESSAGE_EVENT, onReceiveMessage);
    
    return () => {
      socket.off(CHAT_RECEIVE_MESSAGE_EVENT, onReceiveMessage);
    };
  }, [user, targetUserId]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !isActive || sending) return;
    
    setSending(true);
    const socket = getTrackingSocket();
    socket.emit(CHAT_SEND_MESSAGE_EVENT, { receiverId: targetUserId, content: inputText }, (response: any) => {
      setSending(false);
      if (response && response.error) {
        console.error("Failed to send message:", response.error);
        alert(response.error);
      } else if (response && response.success) {
        setMessages(prev => [...prev, response.message]);
        setInputText("");
      }
    });
  };

  if (!user) return null;

  return (
    <Card className={cn("flex flex-col overflow-hidden h-[400px] border border-neutral-200 shadow-sm", className)}>
      <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
        <h3 className="font-semibold text-neutral-900">Chat with {targetUserName}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">No messages yet.</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                    isMe 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-neutral-100 text-neutral-900 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-neutral-50 border-t border-neutral-200">
        {!isActive ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500 justify-center py-2">
            <Icon icon={AlertCircle} size="sm" />
            <span>Messaging disabled (Pickup is no longer active)</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type a message..." 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={!inputText.trim() || sending} className="rounded-full px-4 shrink-0 shadow-sm" aria-label="Send">
              <Icon icon={Send} size="sm" />
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
