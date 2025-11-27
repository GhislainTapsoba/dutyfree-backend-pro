import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const productId = formData.get("productId") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
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
    const fileExtension = file.name.split(".").pop()
    const fileName = `${productId || Date.now()}-${Date.now()}.${fileExtension}`

    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage.from("products").upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      return NextResponse.json({ error: `Erreur upload: ${error.message}` }, { status: 500 })
    }

    // Obtenir l'URL publique
    const { data: publicUrl } = supabase.storage.from("products").getPublicUrl(fileName)

    // Si productId fourni, mettre à jour le produit
    if (productId) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: publicUrl.publicUrl })
        .eq("id", productId)

      if (updateError) {
        return NextResponse.json(
          { error: `Image uploadée mais erreur mise à jour produit: ${updateError.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error("Erreur upload image:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
