import { createClient } from "@/lib/supabase/server";

interface NotificationData {
  user_id: string;
  type: "stock_alert" | "expiry_warning" | "order_update" | "promotion" | "system" | "info";
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "urgent";
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

/**
 * Utility function to send a notification to a user
 * @param notificationData - The notification data
 * @returns The created notification or null if failed
 */
export async function sendNotification(notificationData: NotificationData) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || "medium",
        related_entity_type: notificationData.related_entity_type,
        related_entity_id: notificationData.related_entity_id,
        action_url: notificationData.action_url,
        metadata: notificationData.metadata,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending notification:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in sendNotification:", error);
    return null;
  }
}

/**
 * Send notifications to multiple users
 * @param userIds - Array of user IDs
 * @param notificationData - The notification data (without user_id)
 * @returns Number of notifications sent
 */
export async function sendNotificationToMultipleUsers(
  userIds: string[],
  notificationData: Omit<NotificationData, "user_id">
) {
  const supabase = await createClient();

  try {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || "medium",
      related_entity_type: notificationData.related_entity_type,
      related_entity_id: notificationData.related_entity_id,
      action_url: notificationData.action_url,
      metadata: notificationData.metadata,
      is_read: false,
    }));

    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (error) {
      console.error("Error sending notifications:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in sendNotificationToMultipleUsers:", error);
    return 0;
  }
}

/**
 * Send notification to users with specific preferences
 * @param notificationType - The type of notification (matches preference field)
 * @param notificationData - The notification data
 * @returns Number of notifications sent
 */
export async function sendNotificationByPreference(
  notificationType: "stock_alerts" | "expiry_alerts" | "order_updates" | "promotion_alerts" | "system_alerts",
  notificationData: Omit<NotificationData, "user_id">
) {
  const supabase = await createClient();

  try {
    // Get users who have this notification type enabled
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq(notificationType, true);

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
      return 0;
    }

    if (!preferences || preferences.length === 0) {
      return 0;
    }

    const userIds = preferences.map((p) => p.user_id);
    return await sendNotificationToMultipleUsers(userIds, notificationData);
  } catch (error) {
    console.error("Error in sendNotificationByPreference:", error);
    return 0;
  }
}
