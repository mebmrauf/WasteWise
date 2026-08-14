import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

const AVATAR_FOLDER = "wastewise/avatars";

export function uploadAvatarImage(buffer: Buffer, userId: string): Promise<{ publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: userId,
        folder: AVATAR_FOLDER,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        format: "webp",
        transformation: [
          { width: 512, height: 512, crop: "fill", gravity: "face" }
        ],
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteAvatarImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

const BULK_REQUEST_IMAGE_FOLDER = "wastewise/bulk-request-images";

function uploadImage(buffer: Buffer, folder: string, publicId: string): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder,
        resource_type: "image",
        format: "webp",
        transformation: [{ width: 1600, height: 1600, crop: "limit" }],
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ url: result.secure_url });
      },
    );
    stream.end(buffer);
  });
}

export function uploadBulkRequestImage(buffer: Buffer, businessId: string): Promise<{ url: string }> {
  const publicId = `${businessId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return uploadImage(buffer, BULK_REQUEST_IMAGE_FOLDER, publicId);
}
