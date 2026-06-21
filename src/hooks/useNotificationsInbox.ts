import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  body: string | null;
  link: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  project_id: string | null;
  dedup_key: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(limit = 50) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications-inbox", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications-inbox", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any).rpc("mark_notifications_read", { _ids: ids });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-inbox", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-inbox", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-inbox", user?.id] }),
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.read_at).length;

  return { ...query, unreadCount, markRead, markAllRead, remove };
}
