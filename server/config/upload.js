const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
const maxMb = Number(process.env.UPLOAD_MAX_MB || 5);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, name);
  }
});

function fileFilter(_req, file, cb) {
  if (/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPEG, GIF, WEBP and AVIF images are allowed.'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 }
});

module.exports = { upload, uploadDir };
