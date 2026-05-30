import { api } from "@/lib/api";

export interface NotificationSettings {
	email_enabled: boolean;
	email: {
		project_membership: boolean;
		task_changes: boolean;
	};
	system: Record<string, boolean>;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
	const res = await api.get<{
		success: boolean;
		data: { settings: NotificationSettings };
	}>("/notifications/settings");
	return res.data.settings;
}

export async function updateNotificationSettings(
	patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
	const res = await api.patch<{
		success: boolean;
		data: { settings: NotificationSettings };
	}>("/notifications/settings", patch);
	return res.data.settings;
}

export async function sendTestEmail(): Promise<string> {
	const res = await api.post<{ success: boolean; message: string }>(
		"/notifications/test-email",
		{},
	);
	return res.message;
}
