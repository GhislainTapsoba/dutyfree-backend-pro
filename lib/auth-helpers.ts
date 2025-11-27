import { createClient } from "@/lib/supabase/server"
import { type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

/**
 * Get authenticated user from request
 * Tries Authorization header first, then falls back to cookies
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const supabase = await createClient()

  // Try to get the JWT token from the Authorization header
  const authHeader = request.headers.get("authorization")

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    console.log("[Auth Helper] Token trouvé dans Authorization header")

    // Use the token to get the user
    const { data, error } = await supabase.auth.getUser(token)
    if (error) {
      console.error("[Auth Helper] Erreur getUser avec token:", error.message)
      return null
    }

    console.log("[Auth Helper] User authentifié via token:", data.user?.id)
    return data.user
  }

  console.log("[Auth Helper] Pas de token dans Authorization header, essai avec cookies")
  // Fallback to cookies (for SSR)
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    console.log("[Auth Helper] User authentifié via cookies:", data.user.id)
  }
  return data.user
}
