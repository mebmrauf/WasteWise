import { io, type Socket } from "socket.io-client";
import { publicEnv } from "./env";
import type { PickupStatus } from "./api/pickups";

const SOCKET_ORIGIN = new URL(publicEnv.NEXT_PUBLIC_API_URL).origin;

export const PICKUP_JOIN_EVENT = "pickup:join";
export const PICKUP_LOCATION_UPDATE_EVENT = "pickup:location-update";
export const PICKUP_STATUS_UPDATE_EVENT = "pickup:status-update";

export const PICKUP_JOINED_EVENT = "pickup:joined";
export const PICKUP_LOCATION_EVENT = "pickup:location";
export const PICKUP_STATUS_EVENT = "pickup:status";
export const PICKUP_ERROR_EVENT = "pickup:error";

export const PICKUP_SUBMIT_WEIGHTS_EVENT = "pickup:submit-weights";
export const PICKUP_ACCEPT_WEIGHTS_EVENT = "pickup:accept-weights";
export const PICKUP_REJECT_WEIGHTS_EVENT = "pickup:reject-weights";

export const NOTIFICATION_RECEIVED_EVENT = "notification:received";

export const CHAT_SEND_MESSAGE_EVENT = "send_message";
export const CHAT_RECEIVE_MESSAGE_EVENT = "receive_message";

interface PickupJoinPayload {
  pickupRequestId: string;
}
interface PickupLocationUpdatePayload {
  pickupRequestId: string;
  lat: number;
  lng: number;
}
interface PickupStatusUpdatePayload {
  pickupRequestId: string;
  status: PickupStatus;
}

export interface PickupJoinedPayload {
  pickupRequestId: string;
  status: PickupStatus;
}
export interface PickupLocationPayload {
  pickupRequestId: string;
  lat: number;
  lng: number;
  updatedAt: string;
}
export interface PickupStatusPayload {
  pickupRequestId: string;
  status: PickupStatus;
  createdAt: string;
  /** Present when this pickup is a stop on the collector's active route. */
  routePlanId?: string;
  /** 1-indexed position among the route's not-yet-visited stops, including this one. */
  queuePosition?: number;
  /** Total not-yet-visited stops on the route. */
  stopsRemaining?: number;
}
export interface PickupErrorPayload {
  event: string;
  pickupRequestId?: string;
  error: { code: string; message: string };
}

let socket: Socket | null = null;

export function getTrackingSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_ORIGIN, {
      withCredentials: true,
    });
  }
  return socket;
}
