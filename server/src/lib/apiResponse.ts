// Shared response envelope so every route looks identical on the wire:
// `{ data }` on success, always `{ error: { message, code } }` on failure.
// See docs/api-contract.md.
import type { Response } from "express";

export function sendData<T>(res: Response, status: number, data: T) {
  return res.status(status).json({ data });
}

export function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}
