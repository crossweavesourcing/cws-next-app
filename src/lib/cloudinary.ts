import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary with values from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Uploads a file (Buffer or Base64 string) to Cloudinary
 */
export async function uploadToCloudinary(fileBuffer: Buffer, folder: string = 'cws_catalog'): Promise<string> {
  console.log('[uploadToCloudinary] Config check:', {
    hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed: No result returned.'));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}
