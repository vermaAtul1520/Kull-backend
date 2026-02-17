require('dotenv').config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const https = require('https');
const fs = require('fs');

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

const bucketName = 'kull-uploads-prod-296222413629'; // Hardcoded from user's curl
const fileName = 'test-upload.png';
const fileType = 'image/png';

async function testUpload() {
    try {
        console.log("Generating presigned URL...");
        const key = `uploads/test-${Date.now()}.png`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log("Presigned URL:", uploadUrl);

        console.log("\nAttempting upload...");

        // Create a dummy buffer
        const fileContent = Buffer.from("Test file content");

        const req = https.request(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': fileType,
                'Content-Length': fileContent.length
            }
        }, (res) => {
            console.log(`StatusCode: ${res.statusCode}`);
            console.log(`StatusMessage: ${res.statusMessage}`);

            res.on('data', (d) => {
                process.stdout.write(d);
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });

        req.write(fileContent);
        req.end();

    } catch (err) {
        console.error("Error:", err);
    }
}

testUpload();
