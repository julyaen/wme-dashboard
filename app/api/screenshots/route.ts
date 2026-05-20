import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SCREENSHOTS_DIR = 'C:\\whatsmyedge\\screenshots'
const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'webp']
const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

function findFile(tradeId: string): { filePath: string; ext: string } | null {
  for (const ext of ALLOWED_EXTS) {
    const filePath = path.join(SCREENSHOTS_DIR, `${tradeId}.${ext}`)
    if (fs.existsSync(filePath)) return { filePath, ext }
  }
  return null
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const tradeId = formData.get('tradeId') as string | null

  if (!file || !tradeId) {
    return NextResponse.json({ error: 'Missing file or tradeId' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type. Use png, jpg, jpeg, or webp.' }, { status: 400 })
  }

  ensureDir()

  const existing = findFile(tradeId)
  if (existing) fs.unlinkSync(existing.filePath)

  const fileName = `${tradeId}.${ext}`
  const filePath = path.join(SCREENSHOTS_DIR, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  return NextResponse.json({ ok: true, fileName })
}

export async function GET(req: NextRequest) {
  const tradeId = req.nextUrl.searchParams.get('tradeId')
  if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

  const found = findFile(tradeId)
  if (!found) return NextResponse.json({ exists: false })

  const buffer = fs.readFileSync(found.filePath)
  const base64 = buffer.toString('base64')
  const mime = MIME_MAP[found.ext]

  return NextResponse.json({ exists: true, base64, mime, fileName: path.basename(found.filePath) })
}

export async function DELETE(req: NextRequest) {
  const tradeId = req.nextUrl.searchParams.get('tradeId')
  if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

  const found = findFile(tradeId)
  if (found) fs.unlinkSync(found.filePath)

  return NextResponse.json({ ok: true })
}
