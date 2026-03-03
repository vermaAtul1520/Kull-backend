const s3Service = require("../services/s3Service");

class UploadController {

    // Get Presigned URL for S3 Upload
    getPresignedUrl = async (req, res, next) => {
        try {
            const { fileName, fileType } = req.body;

            if (!fileName || !fileType) {
                return res.status(400).json({
                    success: false,
                    message: "fileName and fileType are required",
                });
            }

            const { uploadUrl, key } = await s3Service.getPresignedUrl(fileName, fileType);

            res.status(200).json({
                success: true,
                message: "Presigned URL generated successfully",
                uploadUrl,
                key,
                fileName
            });
        } catch (err) {
            console.error("Presigned URL Error:", err);
            next(err);
        }
    };
    // Get Bulk Presigned URLs for Multiple S3 Uploads
    getBulkPresignedUrls = async (req, res, next) => {
        try {
            const { files } = req.body;

            if (!files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "An array of files containing fileName and fileType is required",
                });
            }

            // Optional: Limit maximum number of files per request (e.g., 10 for Instagram-like posts)
            if (files.length > 10) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 10 files allowed per request",
                });
            }

            // Enforce size limits implicitly by rejecting if any file explicitly exceeds sizes
            // (Note: The actual size enforcement on S3 side requires Presigned POST rather than PUT, 
            // but we can reject early if metadata is provided by the frontend)
            const MAX_IMAGE_MB = (process.env.MAX_FILE_SIZE || 5242880) / (1024 * 1024);
            const MAX_VIDEO_MB = (process.env.MAX_VIDEO_SIZE || 52428800) / (1024 * 1024);

            for (const file of files) {
                if (!file.fileName || !file.fileType) {
                    return res.status(400).json({
                        success: false,
                        message: "Each file must contain fileName and fileType",
                    });
                }

                const isVideo = file.fileType.startsWith('video/');
                if (file.fileSize) {
                    const sizeMB = file.fileSize / (1024 * 1024);
                    if (isVideo && sizeMB > MAX_VIDEO_MB) {
                        return res.status(400).json({ success: false, message: `Video ${file.fileName} exceeds maximum size of ${MAX_VIDEO_MB}MB` });
                    }
                    if (!isVideo && sizeMB > MAX_IMAGE_MB) {
                        return res.status(400).json({ success: false, message: `Image ${file.fileName} exceeds maximum size of ${Math.round(MAX_IMAGE_MB)}MB` });
                    }
                }
            }

            const urls = await s3Service.getBulkPresignedUrls(files);

            res.status(200).json({
                success: true,
                message: "Bulk Presigned URLs generated successfully",
                data: urls
            });
        } catch (err) {
            console.error("Bulk Presigned URLs Error:", err);
            next(err);
        }
    };
}

module.exports = new UploadController();
