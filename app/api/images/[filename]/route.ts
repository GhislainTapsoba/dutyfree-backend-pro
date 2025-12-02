import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const imagePath = join(process.cwd(), "public", "uploads", filename)
    
    const imageBuffer = await readFile(imagePath)
    
    const ext = filename.split(".").pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    }
    
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": mimeTypes[ext || "jpg"] || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 })
  }
}
