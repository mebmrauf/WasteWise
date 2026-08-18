import { authFetch } from "./auth";

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface GetMessagesResponse {
  messages: Message[];
  nextCursor?: string;
}

export async function getChatHistory(targetUserId: string, cursor?: string, limit: number = 50): Promise<GetMessagesResponse> {
  const query = new URLSearchParams({ limit: limit.toString() });
  if (cursor) {
    query.set("cursor", cursor);
  }
  return authFetch(`/messages/chat/${targetUserId}?${query.toString()}`);
}
