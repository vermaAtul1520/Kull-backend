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
}

module.exports = new UploadController();
