const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

class S3Service {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        });
        this.bucketName = process.env.S3_BUCKET_NAME;
    }

    /**
     * Generate a presigned URL for uploading a file
     * @param {string} fileName 
     * @param {string} fileType 
     * @returns {Promise<{uploadUrl: string, key: string}>}
     */
    async getPresignedUrl(fileName, fileType) {
        const fileExtension = fileName.split('.').pop();
        const randomString = crypto.randomBytes(16).toString('hex');
        const key = `uploads/${randomString}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

        return { uploadUrl, key, fileName };
    }
}

module.exports = new S3Service();
