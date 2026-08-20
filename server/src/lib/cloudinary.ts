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

export function uploadImage(buffer: Buffer, folder: string): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
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
