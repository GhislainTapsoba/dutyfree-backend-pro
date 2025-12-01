import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const productId = formData.get("productId") as string

    if (!file || !file.size) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF" },
        { status: 400 },
      )
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Fichier trop volumineux. Maximum 5MB" }, { status: 400 })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const fileName = `product-${timestamp}-${randomId}.${fileExtension}`

    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from("products")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Storage error:", error)
      return NextResponse.json({ error: `Erreur upload: ${error.message}` }, { status: 500 })
    }

    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from("products")
      .getPublicUrl(fileName)

    const imageUrl = publicUrlData.publicUrl

    // Si productId fourni, mettre à jour le produit
    if (productId) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId)

      if (updateError) {
        console.error("Update error:", updateError)
        return NextResponse.json(
          { error: `Image uploadée mais erreur mise à jour produit: ${updateError.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      url: imageUrl,
      fileName: fileName,
    })
  } catch (error) {
    console.error("Erreur upload image:", error)
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
  }
}
