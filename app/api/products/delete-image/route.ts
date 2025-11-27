import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const productId = searchParams.get("productId")

    if (!path) {
      return NextResponse.json({ error: "Chemin de l'image requis" }, { status: 400 })
    }

    // Supprimer du storage
    const { error } = await supabase.storage.from("products").remove([path])

    if (error) {
      return NextResponse.json({ error: `Erreur suppression: ${error.message}` }, { status: 500 })
    }

    // Si productId fourni, mettre à jour le produit
    if (productId) {
      await supabase.from("products").update({ image_url: null }).eq("id", productId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur suppression image:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
