import { createClient } from "@/lib/supabase/server"
import { type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

/**
 * Get authenticated user from auth_token cookie OR Authorization header
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  // Debug: Afficher TOUS les cookies et headers reçus
  const allCookies = request.cookies.getAll()
  const authHeader = request.headers.get('authorization')

  console.log("[Auth Helper] 🍪 Cookies reçus:", allCookies.map(c => c.name).join(', '))
  console.log("[Auth Helper] 🔑 Authorization header:", authHeader ? 'Présent' : 'Absent')

  const supabase = await createClient()

  // ✅ Essayer d'abord le cookie auth_token, puis le header Authorization
  let token = request.cookies.get('auth_token')?.value

  if (!token && authHeader) {
    // Extraire le token du header "Bearer TOKEN"
    token = authHeader.replace('Bearer ', '')
    console.log("[Auth Helper] 📋 Token extrait du header Authorization")
  }

  if (!token) {
    console.log("[Auth Helper] ❌ Aucun token trouvé (ni cookie ni header)")
    return null
  }

  console.log("[Auth Helper] ✅ Token trouvé, validation...")

  // Vérifier token avec Supabase
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    console.error("[Auth Helper] ❌ Token invalide:", error?.message)
    return null
  }

  console.log("[Auth Helper] ✅ User authentifié:", data.user.id, data.user.email)
  return data.user
}

/**
 * Check if user has one of the allowed roles
 */
export async function checkUserRole(userId: string, allowedRoles: string[]): Promise<{ authorized: boolean; roleCode?: string }> {
  const supabase = await createClient()

  try {
    const { data: userProfile, error } = await supabase
      .from("users")
      .select("role:roles(code)")
      .eq("id", userId)
      .single()

    if (error || !userProfile) {
      console.error("[Role Check] Error fetching user role:", error?.message)
      return { authorized: false }
    }

    const userRole = Array.isArray(userProfile?.role) ? userProfile.role[0] : userProfile?.role
    const roleCode = userRole?.code

    if (!roleCode) {
      console.log("[Role Check] User has no role assigned")
      return { authorized: false }
    }

    const isAuthorized = allowedRoles.includes(roleCode)
    console.log("[Role Check] User role:", roleCode, "Allowed:", allowedRoles, "Authorized:", isAuthorized)

    return { authorized: isAuthorized, roleCode }
  } catch (error) {
    console.error("[Role Check] Exception:", error)
    return { authorized: false }
  }
}
