import { createClient } from "@/lib/supabase/server"
import { type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

/**
 * Get authenticated user from auth_token cookie only
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const supabase = await createClient()
  
  // ✅ UNIQUEMENT auth_token cookie (comme frontend)
  const token = request.cookies.get('auth_token')?.value
  
  if (!token) {
    console.log("[Auth Helper] Pas de auth_token cookie")
    return null
  }

  console.log("[Auth Helper] Token cookie trouvé, validation...")
  
  // Vérifier token avec Supabase
  const { data, error } = await supabase.auth.getUser(token)
  
  if (error || !data.user) {
    console.error("[Auth Helper] Token invalide:", error?.message)
    return null
  }

  console.log("[Auth Helper] ✅ User:", data.user.id, data.user.email)
  return data.user
}
