// Mirrors sofiacart-backend NotificationResource (Laravel database notifications), served at
// GET /api/v1/notifications (merchants) and GET /api/admin/notifications (admins).

export interface AppNotification {
  id: string;
  kind: string | null;
  title: string | null;
  message: string | null;
  // Frontend route to open, e.g. "/store-profile" or "/admin/merchants/12".
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationPage {
  data: AppNotification[];
  meta: { current_page: number; last_page: number; total: number; unread_count: number };
}
