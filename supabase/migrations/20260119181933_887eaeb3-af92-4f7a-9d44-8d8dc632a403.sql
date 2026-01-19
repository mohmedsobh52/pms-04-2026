-- Fix Security Issue: Add DELETE policy to evm_alert_settings (missing)
CREATE POLICY "Users can delete their own alert settings"
ON public.evm_alert_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Fix Security Issue: Add DELETE policy to user_notification_preferences (missing)
CREATE POLICY "Users can delete their own notification preferences"
ON public.user_notification_preferences
FOR DELETE
USING (auth.uid() = user_id);