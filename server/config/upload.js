const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const uploadDir = isServerless ? path.join(os.tmpdir(), 'sai-university-uploads') : path.join(__dirname, '..', 'uploads');
const maxMb = Number(process.env.UPLOAD_MAX_MB || 5);

const allowedExtensions = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif']
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, name);
  }
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = allowedExtensions[file.mimetype] || [];
  if (!validExts.includes(ext)) {
    return cb(new Error('Only valid PNG, JPEG, GIF, WEBP and AVIF images are allowed.'));
  }
  return cb(null, true);
}

function hasImageSignature(buffer) {
  const isPng = buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG';
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isGif = buffer.toString('ascii', 0, 3) === 'GIF';
  const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  const brand = buffer.toString('ascii', 8, 12);
  const isAvif = buffer.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(brand);
  return isPng || isJpeg || isGif || isWebp || isAvif;
}

function verifyUploadedImage(req, _res, next) {
  if (!req.file) return next();

  let buffer;
  try {
    buffer = Buffer.alloc(12);
    const descriptor = fs.openSync(req.file.path, 'r');
    try {
      fs.readSync(descriptor, buffer, 0, 12, 0);
    } finally {
      fs.closeSync(descriptor);
    }
  } catch (_error) {
    buffer = Buffer.alloc(0);
  }

  if (!hasImageSignature(buffer)) {
    fs.promises.unlink(req.file.path).catch(() => {});
    const error = new Error('The uploaded file is not a valid image.');
    error.statusCode = 400;
    return next(error);
  }

  return next();
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 }
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (ext !== '.csv' || !allowedTypes.includes(file.mimetype)) {
      const error = new Error('Only CSV files are allowed.');
      error.statusCode = 400;
      return cb(error);
    }
    return cb(null, true);
  }
});

module.exports = { upload, csvUpload, uploadDir, verifyUploadedImage };
