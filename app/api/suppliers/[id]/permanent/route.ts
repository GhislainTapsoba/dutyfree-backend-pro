import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// DELETE - Supprimer définitivement un fournisseur
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Vérifier si le fournisseur a des commandes
    const { data: orders } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("supplier_id", id)
      .limit(1)

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un fournisseur avec des commandes" },
        { status: 400 }
      )
    }

    // Supprimer le fournisseur
    const { error } = await supabase.from("suppliers").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Fournisseur supprimé définitivement" })
  } catch (error) {
    console.error("Error deleting supplier permanently:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
