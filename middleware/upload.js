const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create upload directories
const uploadDirs = {
  communities: path.join(__dirname, '../uploads/communities'),
  content: path.join(__dirname, '../uploads/content'),
  avatars: path.join(__dirname, '../uploads/avatars'),
  temp: path.join(__dirname, '../uploads/temp')
};

Object.values(uploadDirs).forEach(ensureDirectoryExists);

// Storage configuration
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      const filename = `${Date.now()}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    }
  });
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

// Size limits (5MB for most files, 50MB for videos)
const getFileSize = (file) => {
  const videoTypes = ['video/mp4', 'video/webm'];
  return videoTypes.includes(file.mimetype) ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
};

// Community documents upload
const communityUpload = multer({
  storage: createStorage(uploadDirs.communities),
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6 // Max 5 documents + 1 logo
  }
});

// Content attachments upload
const contentUpload = multer({
  storage: createStorage(uploadDirs.content),
  fileFilter: contentFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for videos, handled dynamically
    files: 10 // Max 10 files per content
  }
});

// Avatar upload
const avatarUpload = multer({
  storage: createStorage(uploadDirs.avatars),
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
});

// General upload for various purposes
const generalUpload = multer({
  storage: createStorage(uploadDirs.temp),
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

// Utility function to validate file size based on type
const validateFileSize = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files ? Object.values(req.files).flat() : [req.file];
  
  for (const file of files) {
    const maxSize = getFileSize(file);
    if (file.size > maxSize) {
      // Delete the uploaded file
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(400).json({
        success: false,
        message: `File ${file.originalname} exceeds maximum size limit.`
      });
    }
  }
  
  next();
};

// Utility function to clean up uploaded files in case of error
const cleanupFiles = (files) => {
  if (!files) return;
  
  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  
  fileList.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  });
};

// Middleware to add file information to request
const processFileInfo = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    req.fileInfo = files.map(file => ({
      fieldName: file.fieldname,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
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
    validateFileSize,
    processFileInfo
  ],
  
  // For content creation (multiple attachments)
  content: [
    contentUpload.array('attachments', 10),
    handleUploadError,
    validateFileSize,
    processFileInfo
  ],
  
  // For user avatar
  avatar: [
    avatarUpload.single('avatar'),
    handleUploadError,
    validateFileSize,
    processFileInfo
  ],
  
  // For general purpose uploads
  general: [
    generalUpload.array('files', 5),
    handleUploadError,
    validateFileSize,
    processFileInfo
  ]
};

// Helper function to get file URL
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  const relativePath = filePath.replace(path.join(__dirname, '../'), '');
  return `${process.env.BASE_URL || 'http://localhost:5000'}/${relativePath.replace(/\\/g, '/')}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return resolve();
    }
    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to move file from temp to permanent location
const moveFile = (sourcePath, destinationDir, newFileName) => {
  return new Promise((resolve, reject) => {
    ensureDirectoryExists(destinationDir);
    const destinationPath = path.join(destinationDir, newFileName);
    
    fs.rename(sourcePath, destinationPath, (err) => {
      if (err) {
        console.error('Error moving file:', err);
        reject(err);
      } else {
        resolve(destinationPath);
      }
    });
  });
};

module.exports = {
  uploads,
  communityUpload,
  contentUpload,
  avatarUpload,
  generalUpload,
  handleUploadError,
  validateFileSize,
  processFileInfo,
  cleanupFiles,
  getFileUrl,
  deleteFile,
  moveFile,
  uploadDirs
};