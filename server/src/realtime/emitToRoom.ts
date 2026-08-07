import { getIO, pickupRoomName } from "./socket";

export function emitToRoom(pickupRequestId: string, event: string, payload: unknown): void {
  const emitter = getIO().to(pickupRoomName(pickupRequestId)) as unknown as {
    emit: (event: string, payload: unknown) => void;
  };
  emitter.emit(event, payload);
}
