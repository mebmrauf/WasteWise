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
