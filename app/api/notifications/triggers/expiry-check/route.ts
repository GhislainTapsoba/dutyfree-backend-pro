import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Automatic Expiry Alert Trigger
 * Checks all lots and creates notifications for products nearing expiry
 * Should be called periodically via cron job
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get notification preferences to determine warning days
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id, expiry_alerts, expiry_warning_days")
      .eq("expiry_alerts", true);

    if (prefsError) throw prefsError;

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({
        message: "No users subscribed to expiry alerts",
        stats: {
          lots_checked: 0,
          expired: 0,
          expiring_soon: 0,
          notifications_created: 0,
        },
      });
    }

    // Get the maximum warning days from all users
    const maxWarningDays = Math.max(
      ...preferences.map((p) => p.expiry_warning_days || 30)
    );

    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + maxWarningDays);

    // Get all lots with expiry dates
    const { data: lots, error: lotsError } = await supabase
      .from("lots")
      .select(`
        id,
        lot_number,
        expiry_date,
        current_quantity,
        product:product_id (
          id,
          name,
          name_en
        )
      `)
      .not("expiry_date", "is", null)
      .lte("expiry_date", warningDate.toISOString())
      .gt("current_quantity", 0);

    if (lotsError) throw lotsError;

    const notifications = [];
    const expiredLots = [];
    const expiringSoonLots = [];

    // Categorize lots
    for (const lot of lots || []) {
      const expiryDate = new Date(lot.expiry_date);

      if (expiryDate < today) {
        expiredLots.push(lot);
      } else {
        expiringSoonLots.push({
          ...lot,
          daysUntilExpiry: Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          ),
        });
      }
    }

    // Create notifications for each user based on their preferences
    for (const pref of preferences) {
      const userWarningDays = pref.expiry_warning_days || 30;

      // Notifications for expired lots
      for (const lot of expiredLots) {
        const expiryDate = new Date(lot.expiry_date);
        const daysExpired = Math.ceil(
          (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        notifications.push({
          user_id: pref.user_id,
          type: "expiry_warning",
          title: "Produit périmé",
          message: `Le lot "${lot.lot_number}" du produit "${lot.product.name}" est périmé depuis ${daysExpired} jour${daysExpired > 1 ? "s" : ""} (Quantité: ${lot.current_quantity})`,
          priority: "urgent",
          related_entity_type: "lot",
          related_entity_id: lot.id,
          action_url: `/dashboard/products/${lot.product.id}`,
          metadata: {
            lot_id: lot.id,
            lot_number: lot.lot_number,
            product_id: lot.product.id,
            product_name: lot.product.name,
            expiry_date: lot.expiry_date,
            days_expired: daysExpired,
            quantity: lot.current_quantity,
            alert_type: "expired",
          },
          is_read: false,
        });
      }

      // Notifications for lots expiring soon (within user's warning threshold)
      for (const lot of expiringSoonLots) {
        if (lot.daysUntilExpiry <= userWarningDays) {
          const priority =
            lot.daysUntilExpiry <= 7
              ? "urgent"
              : lot.daysUntilExpiry <= 14
              ? "high"
              : "medium";

          notifications.push({
            user_id: pref.user_id,
            type: "expiry_warning",
            title: "Produit bientôt périmé",
            message: `Le lot "${lot.lot_number}" du produit "${lot.product.name}" expire dans ${lot.daysUntilExpiry} jour${lot.daysUntilExpiry > 1 ? "s" : ""} (Quantité: ${lot.current_quantity})`,
            priority,
            related_entity_type: "lot",
            related_entity_id: lot.id,
            action_url: `/dashboard/products/${lot.product.id}`,
            metadata: {
              lot_id: lot.id,
              lot_number: lot.lot_number,
              product_id: lot.product.id,
              product_name: lot.product.name,
              expiry_date: lot.expiry_date,
              days_until_expiry: lot.daysUntilExpiry,
              quantity: lot.current_quantity,
              alert_type: "expiring_soon",
            },
            is_read: false,
          });
        }
      }
    }

    // Insert notifications in batches, avoiding duplicates
    if (notifications.length > 0) {
      // Check for existing notifications in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: existingNotifications, error: existingError } = await supabase
        .from("notifications")
        .select("related_entity_id, user_id")
        .eq("type", "expiry_warning")
        .gte("created_at", yesterday.toISOString());

      if (existingError) throw existingError;

      // Filter out duplicate notifications
      const existingKeys = new Set(
        existingNotifications?.map(
          (n: any) => `${n.user_id}-${n.related_entity_id}`
        ) || []
      );

      const newNotifications = notifications.filter(
        (n) => !existingKeys.has(`${n.user_id}-${n.related_entity_id}`)
      );

      if (newNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(newNotifications);

        if (insertError) throw insertError;
      }

      return NextResponse.json({
        message: "Expiry check completed",
        stats: {
          lots_checked: lots?.length || 0,
          expired: expiredLots.length,
          expiring_soon: expiringSoonLots.length,
          notifications_created: newNotifications.length,
          notifications_skipped: notifications.length - newNotifications.length,
        },
      });
    }

    return NextResponse.json({
      message: "Expiry check completed - no alerts needed",
      stats: {
        lots_checked: lots?.length || 0,
        expired: 0,
        expiring_soon: 0,
        notifications_created: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error checking expiry dates" },
      { status: 500 }
    );
  }
}
