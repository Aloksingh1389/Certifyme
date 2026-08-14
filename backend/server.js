import cors from 'cors'
import express from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT || 3001)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
const uploadsDir = path.join(__dirname, 'uploads')
const metadataFile = path.join(dataDir, 'certificates.json')
const frontendDist = path.join(__dirname, '..', 'dist')

const app = express()
const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, callback) => {
      callback(null, uploadsDir)
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname)
      callback(null, `${crypto.randomUUID()}${extension}`)
    },
  }),
})

let certificates = []

await mkdir(dataDir, { recursive: true })
await mkdir(uploadsDir, { recursive: true })

async function loadCertificates() {
  try {
    const contents = await readFile(metadataFile, 'utf8')
    const parsed = JSON.parse(contents)
    certificates = Array.isArray(parsed) ? parsed : []
  } catch {
    certificates = []
  }
}

async function saveCertificates() {
  await writeFile(metadataFile, JSON.stringify(certificates, null, 2))
}

function publicCertificate(record) {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    fileType: record.fileType,
    size: record.size,
    createdAt: record.createdAt,
    originalName: record.originalName,
    viewUrl: `/api/certificates/${record.id}/view`,
    downloadUrl: `/api/certificates/${record.id}/download`,
    deleteUrl: `/api/certificates/${record.id}`,
  }
}

function findCertificate(id) {
  return certificates.find((certificate) => certificate.id === id)
}

function attachmentName(name) {
  return name.replaceAll('"', "'")
}

async function sendStoredFile(response, certificate, disposition) {
  response.setHeader('Content-Type', certificate.fileType || 'application/octet-stream')
  response.setHeader('Content-Disposition', `${disposition}; filename="${attachmentName(certificate.originalName || certificate.name)}"`)
  response.sendFile(path.join(uploadsDir, certificate.storedName))
}

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/certificates', (_request, response) => {
  response.json(certificates.map(publicCertificate))
})

app.post('/api/certificates', upload.array('files'), async (request, response) => {
  const files = request.files || []

  if (!files.length) {
    return response.status(400).json({ message: 'At least one file is required.' })
  }

  const title = String(request.body?.title || '').trim()
  const category = String(request.body?.category || 'Education').trim() || 'Education'
  const createdAt = new Date().toISOString()

  const createdCertificates = files.map((file) => ({
    id: crypto.randomUUID(),
    name: title || file.originalname,
    category,
    fileType: file.mimetype || 'application/octet-stream',
    size: file.size,
    createdAt,
    originalName: file.originalname,
    storedName: file.filename,
  }))

  certificates = [...createdCertificates, ...certificates]
  await saveCertificates()

  response.status(201).json(createdCertificates.map(publicCertificate))
})

app.get('/api/certificates/:id/view', async (request, response) => {
  const certificate = findCertificate(request.params.id)

  if (!certificate) {
    return response.status(404).json({ message: 'Certificate not found.' })
  }

  await sendStoredFile(response, certificate, 'inline')
})

app.get('/api/certificates/:id/download', async (request, response) => {
  const certificate = findCertificate(request.params.id)

  if (!certificate) {
    return response.status(404).json({ message: 'Certificate not found.' })
  }

  await sendStoredFile(response, certificate, 'attachment')
})

app.delete('/api/certificates/:id', async (request, response) => {
  const certificate = findCertificate(request.params.id)

  if (!certificate) {
    return response.status(404).json({ message: 'Certificate not found.' })
  }

  certificates = certificates.filter((item) => item.id !== request.params.id)
  await saveCertificates()

  const filePath = path.join(uploadsDir, certificate.storedName)
  if (existsSync(filePath)) {
    await unlink(filePath)
  }

  response.status(204).end()
})

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(path.join(frontendDist, 'index.html'))
  })
}

await loadCertificates()

app.listen(PORT, () => {
  console.log(`Certifyme backend listening on http://localhost:${PORT}`)
})