import { authFetch, readCsrfToken } from "./auth";

export function uploadWastePhotos(files: File[]): Promise<{ urls: string[] }> {
  const formData = new FormData();
  for (const file of files) formData.append("photos", file);
  return authFetch<{ urls: string[] }>("/waste-photos", {
    method: "POST",
    body: formData,
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
