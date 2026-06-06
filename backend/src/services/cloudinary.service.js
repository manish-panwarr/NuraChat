import cloudinary from "../config/cloudinary.js";

//@desc cloudinary resource type
function getResourceType(mimetype) {
    if (!mimetype) return "auto";
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    return "raw"; // documents, audio, etc.
}

//@desc upload file to cloudinary
export const uploadToCloudinary = (fileBuffer, mimetype, options = {}) => {
    return new Promise((resolve, reject) => {
        const resourceType = getResourceType(mimetype);

        const uploadOptions = {
            folder: options.folder || "nurachat/chat-media",
            resource_type: resourceType,
            ...options,
        };

        // Remove folder from spread to avoid conflicts
        delete uploadOptions.mimetype;

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type,
                    format: result.format,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height,
                    duration: result.duration, // for video/audio
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

//@desc delete single file from cloudinar
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        console.error(`Cloudinary delete error for ${publicId}:`, error);
        throw error;
    }
};

//@desc : batch delete multiple files from cloudinary
export const deleteMultipleFromCloudinary = async (items) => {
    if (!items || items.length === 0) return [];

    const grouped = {};
    for (const item of items) {
        const type = item.resourceType || "image";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(item.publicId);
    }

    const results = [];
    for (const [resourceType, publicIds] of Object.entries(grouped)) {
        try {
            const result = await cloudinary.api.delete_resources(publicIds, {
                resource_type: resourceType,
            });
            results.push(result);
        } catch (error) {
            console.error(`Cloudinary batch delete error for ${resourceType}:`, error);
        }
    }

    return results;
};
