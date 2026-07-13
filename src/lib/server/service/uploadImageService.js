import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import 'dotenv/config';

// 2. Konfigurasi Cloudinary (menggunakan data dari .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = (buffer, folderName) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                folder: folderName,
                resource_type: "image"
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};
export const uploadBase64ToCloudinary = (base64String, folderName) => {
    return new Promise(async (resolve, reject) => {
        if (!base64String) return resolve("");
        
        try {
            // Menggunakan uploader.upload dari instance cloudinary yang sudah terkonfigurasi di file ini
            const result = await cloudinary.v2.uploader.upload(base64String, {
                folder: folderName,
                resource_type: "image"
            });
            resolve(result.secure_url);
        } catch (error) {
            reject(error);
        }
    });
};