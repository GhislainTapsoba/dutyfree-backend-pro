import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Automatic Stock Alert Trigger
 * Checks all products and creates notifications for low stock levels
 * Should be called periodically via cron job
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get all active products with their current stock levels
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        name_en,
        min_stock_level,
        max_stock_level,
        lots (
          id,
          current_quantity
        )
      `)
      .eq("is_active", true);

    if (productsError) throw productsError;

    const notifications = [];
    const lowStockProducts = [];
    const outOfStockProducts = [];

    // Calculate current stock for each product
    for (const product of products || []) {
      const currentStock = product.lots?.reduce(
        (sum: number, lot: any) => sum + (lot.current_quantity || 0),
        0
      ) || 0;

      // Check if stock is below minimum level
      if (currentStock <= 0) {
        outOfStockProducts.push({
          id: product.id,
          name: product.name,
          name_en: product.name_en,
          currentStock,
          minStock: product.min_stock_level,
        });
      } else if (currentStock < product.min_stock_level) {
        lowStockProducts.push({
          id: product.id,
          name: product.name,
          name_en: product.name_en,
          currentStock,
          minStock: product.min_stock_level,
        });
      }
    }

    // Get users who should receive stock alerts
    const { data: users, error: usersError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("stock_alerts", true);

    if (usersError) throw usersError;

    const userIds = users?.map((u) => u.user_id) || [];

    // Create notifications for out of stock products
    for (const product of outOfStockProducts) {
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          type: "stock_alert",
          title: "Rupture de stock",
          message: `Le produit "${product.name}" est en rupture de stock (Stock actuel: ${product.currentStock})`,
          priority: "urgent",
          related_entity_type: "product",
          related_entity_id: product.id,
          action_url: `/dashboard/products/${product.id}`,
          metadata: {
            product_id: product.id,
            product_name: product.name,
            current_stock: product.currentStock,
            min_stock: product.minStock,
            alert_type: "out_of_stock",
          },
          is_read: false,
        });
      }
    }

    // Create notifications for low stock products
    for (const product of lowStockProducts) {
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          type: "stock_alert",
          title: "Stock faible",
          message: `Le produit "${product.name}" a un stock faible (${product.currentStock}/${product.minStock})`,
          priority: "high",
          related_entity_type: "product",
          related_entity_id: product.id,
          action_url: `/dashboard/products/${product.id}`,
          metadata: {
            product_id: product.id,
            product_name: product.name,
            current_stock: product.currentStock,
            min_stock: product.minStock,
            alert_type: "low_stock",
          },
          is_read: false,
        });
      }
    }

    // Insert notifications in batches
    if (notifications.length > 0) {
      // Check for existing notifications in the last 24 hours to avoid duplicates
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: existingNotifications, error: existingError } = await supabase
        .from("notifications")
        .select("related_entity_id, user_id")
        .eq("type", "stock_alert")
        .gte("created_at", yesterday.toISOString());

      if (existingError) throw existingError;

      // Filter out notifications that already exist
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
        message: "Stock check completed",
        stats: {
          products_checked: products?.length || 0,
          out_of_stock: outOfStockProducts.length,
          low_stock: lowStockProducts.length,
          notifications_created: newNotifications.length,
          notifications_skipped: notifications.length - newNotifications.length,
        },
      });
    }

    return NextResponse.json({
      message: "Stock check completed - no alerts needed",
      stats: {
        products_checked: products?.length || 0,
        out_of_stock: 0,
        low_stock: 0,
        notifications_created: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error checking stock levels" },
      { status: 500 }
    );
  }
}
