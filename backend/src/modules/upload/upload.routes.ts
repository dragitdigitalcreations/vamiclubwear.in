import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '../../middleware/auth'

const router = Router()

// ── Cloudinary config — called lazily at request time so dotenv has run first ──
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// ── Multer — memory storage, 50 MB limit ──────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`Unsupported file type: ${file.mimetype}`))
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function uploadToCloudinary(
  buffer: Buffer,
  mimetype: string,
  folder = 'vami-products'
): Promise<{ url: string; publicId: string; type: 'IMAGE' | 'VIDEO' }> {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video') ? 'video' : 'image'

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Auto-quality and format for images
        ...(resourceType === 'image' && {
          quality: 'auto',
          fetch_format: 'auto',
        }),
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          type:     resourceType === 'video' ? 'VIDEO' : 'IMAGE',
        })
      }
    )

    stream.end(buffer)
  })
}

// ── POST /api/uploads ─────────────────────────────────────────────────────────
// Accepts up to 20 files as multipart/form-data field "files"
// Returns: { uploads: [{ url, publicId, type }] }

router.post(
  '/',
  requireAuth,
  upload.array('files', 20) as any,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!configureCloudinary()) {
        res.status(503).json({
          error: 'Media uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.',
        })
        return
      }

      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files received' })
        return
      }

      const uploads = await Promise.all(
        files.map((f) => uploadToCloudinary(f.buffer, f.mimetype))
      )

      res.json({ uploads })
    } catch (err) {
      next(err)
    }
  }
)

export default router
