import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Convertir le fichier en base64 pour stockage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type
    const dataUrl = `data:${mimeType};base64,${base64}`

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: dataUrl })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ image_url: dataUrl })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}