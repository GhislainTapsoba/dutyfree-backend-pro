import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id requis" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // If no preferences exist, return default settings
    if (!data) {
      const defaultPreferences = {
        user_id,
        email_notifications: true,
        push_notifications: true,
        stock_alerts: true,
        expiry_alerts: true,
        order_updates: true,
        promotion_alerts: true,
        system_alerts: true,
        low_stock_threshold: 10,
        expiry_warning_days: 30,
      };

      return NextResponse.json({ data: defaultPreferences });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des préférences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      user_id,
      email_notifications,
      push_notifications,
      stock_alerts,
      expiry_alerts,
      order_updates,
      promotion_alerts,
      system_alerts,
      low_stock_threshold,
      expiry_warning_days,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id requis" },
        { status: 400 }
      );
    }

    // Use upsert to create or update
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id,
          email_notifications: email_notifications ?? true,
          push_notifications: push_notifications ?? true,
          stock_alerts: stock_alerts ?? true,
          expiry_alerts: expiry_alerts ?? true,
          order_updates: order_updates ?? true,
          promotion_alerts: promotion_alerts ?? true,
          system_alerts: system_alerts ?? true,
          low_stock_threshold: low_stock_threshold ?? 10,
          expiry_warning_days: expiry_warning_days ?? 30,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'enregistrement des préférences" },
      { status: 500 }
    );
  }
}
