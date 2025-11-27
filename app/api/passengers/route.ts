import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/passengers - Liste des informations passagers
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const flightNumber = searchParams.get("flight")
  const airline = searchParams.get("airline")
  const destination = searchParams.get("destination")

  try {
    let query = supabase.from("passenger_info").select("*").order("created_at", { ascending: false })

    if (flightNumber) {
      query = query.ilike("flight_number", `%${flightNumber}%`)
    }
    if (airline) {
      query = query.ilike("airline", `%${airline}%`)
    }
    if (destination) {
      query = query.ilike("destination", `%${destination}%`)
    }

    const { data, error } = await query.limit(100)
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching passengers:", error)
    return NextResponse.json({ error: "Failed to fetch passengers" }, { status: 500 })
  }
}

// POST /api/passengers - Enregistrer info passager depuis carte embarquement
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const {
      passenger_name,
      flight_number,
      airline,
      destination,
      boarding_pass_ref,
      seat_number,
      travel_class,
      sale_id,
    } = body

    const { data, error } = await supabase
      .from("passenger_info")
      .insert({
        passenger_name,
        flight_number,
        airline,
        destination,
        boarding_pass_ref,
        seat_number,
        travel_class,
        sale_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating passenger info:", error)
    return NextResponse.json({ error: "Failed to create passenger info" }, { status: 500 })
  }
}
