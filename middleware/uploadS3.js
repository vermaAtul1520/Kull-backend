// middleware/uploadS3.js - S3 Storage for AWS Lambda
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'ap-south-1',
});

const S3_BUCKET = process.env.S3_BUCKET_NAME;

// Generate unique filename
const generateFileName = (file) => {
  const uniqueSuffix = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(file.originalname);
  return `${Date.now()}-${uniqueSuffix}${extension}`;
};

// File filter for documents (PDF, DOC, DOCX, images)
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and image files are allowed.'), false);
  }
};

// File filter for images only
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

// File filter for content attachments
const contentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav'
  ];

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp4', '.webm', '.mp3', '.wav'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please check allowed file formats.'), false);
  }
};

// Create S3 storage configuration
const createS3Storage = (folder) => {
  return multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user?.id || 'anonymous'
      });
    },
    key: (req, file, cb) => {
      const fileName = generateFileName(file);
      cb(null, `${folder}/${fileName}`);
    }
  });
};

// Community documents upload
const communityUpload = multer({
  storage: createS3Storage('communities'),
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6 // Max 5 documents + 1 logo
  }
});

// Content attachments upload
const contentUpload = multer({
  storage: createS3Storage('content'),
  fileFilter: contentFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for videos
    files: 10 // Max 10 files per content
  }
});

// Avatar upload
const avatarUpload = multer({
  storage: createS3Storage('avatars'),
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
});

// General upload for various purposes
const generalUpload = multer({
  storage: createS3Storage('general'),
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  }
});

// Error handling middleware for multer errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum allowed size is 5MB for documents and images, 50MB for videos.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Please reduce the number of files.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Please check your form configuration.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Middleware to add file information to request (S3 version)
const processFileInfo = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    req.fileInfo = files.map(file => ({
      fieldName: file.fieldname,
      originalName: file.originalname,
      fileName: file.key,
      filePath: file.location, // S3 URL
      fileType: file.mimetype,
      fileSize: file.size,
      bucket: file.bucket,
      key: file.key,
      uploadedAt: new Date()
    }));
  }
  
  next();
};

// Specific upload configurations for different routes
const uploads = {
  // For community registration (documents + logo)
  community: [
    communityUpload.fields([
      { name: 'documents', maxCount: 5 },
      { name: 'logo', maxCount: 1 }
    ]),
    handleUploadError,
    processFileInfo
  ],
  
  // For content creation (multiple attachments)
  content: [
    contentUpload.array('attachments', 10),
    handleUploadError,
    processFileInfo
  ],
  
  // For user avatar
  avatar: [
    avatarUpload.single('avatar'),
    handleUploadError,
    processFileInfo
  ],
  
  // For general purpose uploads
  general: [
    generalUpload.array('files', 5),
    handleUploadError,
    processFileInfo
  ]
};

// Helper function to get file URL from S3
const getFileUrl = (key) => {
  if (!key) return null;
  const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || 'ap-south-1';
  return `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
};

// Helper function to delete file from S3
const deleteFile = async (key) => {
  if (!key) return;
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Helper function to extract S3 key from URL
const getKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch {
    return url; // Return as-is if not a valid URL (might already be a key)
  }
};

module.exports = {
  uploads,
  communityUpload,
  contentUpload,
  avatarUpload,
  generalUpload,
  handleUploadError,
  processFileInfo,
  getFileUrl,
  deleteFile,
  getKeyFromUrl,
  s3Client,
  S3_BUCKET
};
