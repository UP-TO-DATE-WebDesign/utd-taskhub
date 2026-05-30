import { useEffect, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionBlock, Toggle } from "@/components/workspace-settings/SectionBlock";
import { useAuth } from "@/context/AuthContext";
import {
	getNotificationSettings,
	updateNotificationSettings,
	sendTestEmail,
	type NotificationSettings,
} from "@/services/notification-settings.service";

const EMAIL_OPTIONS: { key: keyof NotificationSettings["email"]; label: string; description: string }[] = [
	{
		key: "project_membership",
		label: "Project membership changes",
		description: "When you are added to or removed from a project.",
	},
	{
		key: "task_changes",
		label: "Assigned task changes",
		description: "When a task assigned to you is updated by someone else.",
	},
];

const SYSTEM_OPTIONS: { key: string; label: string; description: string }[] = [
	{ key: "project.member_added", label: "Added to a project", description: "You were added to a project." },
	{ key: "project.member_removed", label: "Removed from a project", description: "You were removed from a project." },
	{ key: "task.assigned", label: "Task assigned", description: "A task was assigned to you." },
	{ key: "task.updated", label: "Assigned task updated", description: "A task assigned to you changed." },
	{ key: "task.due_soon", label: "Task due soon", description: "An assigned task is due within 24 hours." },
	{ key: "task.overdue", label: "Task overdue", description: "An assigned task passed its due date." },
	{ key: "ticket.closed", label: "Ticket closed", description: "A ticket you manage was closed." },
	{ key: "comment.mentioned", label: "Mentions", description: "You were mentioned in a comment." },
	{ key: "role.changed", label: "Role changed", description: "Your role was updated." },
	{ key: "sprint.started", label: "Sprint started", description: "A sprint you are part of started." },
	{ key: "sprint.ended", label: "Sprint ended", description: "A sprint you are part of ended." },
];

function NotificationRow({
	label,
	description,
	checked,
	onChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4 py-3">
			<div className="min-w-0">
				<p className="text-sm font-medium text-foreground">{label}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
			</div>
			<Toggle checked={checked} onChange={onChange} />
		</div>
	);
}

export function ProfileNotificationsSection() {
	const { user } = useAuth();
	const [settings, setSettings] = useState<NotificationSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [sendingTest, setSendingTest] = useState(false);

	useEffect(() => {
		setLoading(true);
		setError(false);
		getNotificationSettings()
			.then((s) => setSettings(s))
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	}, []);

	// Optimistic save: apply locally, PATCH the changed slice, revert on failure.
	async function save(patch: Partial<NotificationSettings>, next: NotificationSettings) {
		const previous = settings;
		setSettings(next);
		try {
			const saved = await updateNotificationSettings(patch);
			setSettings(saved);
		} catch {
			setSettings(previous);
			toast.error("Failed to save notification settings.");
		}
	}

	async function handleSendTest() {
		setSendingTest(true);
		try {
			const message = await sendTestEmail();
			toast.success(message);
		} catch {
			toast.error("Failed to send test email.");
		} finally {
			setSendingTest(false);
		}
	}

	if (loading) {
		return (
			<Card className="p-4 sm:p-6">
				<Skeleton className="mb-4 h-5 w-40" />
				<div className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			</Card>
		);
	}

	if (error || !settings) {
		return (
			<Card className="p-4 sm:p-6">
				<p className="text-sm text-muted-foreground">
					Failed to load notification settings. Please try again later.
				</p>
			</Card>
		);
	}

	const toggleEmailEnabled = () =>
		save(
			{ email_enabled: !settings.email_enabled },
			{ ...settings, email_enabled: !settings.email_enabled },
		);

	const toggleEmailOption = (key: keyof NotificationSettings["email"]) => {
		const value = !settings.email[key];
		save(
			{ email: { ...settings.email, [key]: value } },
			{ ...settings, email: { ...settings.email, [key]: value } },
		);
	};

	const toggleSystemOption = (key: string) => {
		const value = settings.system[key] === false;
		save(
			{ system: { ...settings.system, [key]: value } },
			{ ...settings, system: { ...settings.system, [key]: value } },
		);
	};

	return (
		<div className="space-y-4">
			<SectionBlock
				title="Email notifications"
				description="Receive notifications by email in addition to in-app alerts."
			>
				<div className="divide-y divide-border">
					<NotificationRow
						label="Receive notifications via email"
						description="Turn email delivery on or off for your account."
						checked={settings.email_enabled}
						onChange={toggleEmailEnabled}
					/>

					{settings.email_enabled && (
						<>
							<div className="flex flex-col gap-2 py-3">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Mail className="h-4 w-4 shrink-0" />
									<span>
										Emails are sent to{" "}
										<span className="font-medium text-foreground break-all">
											{user?.email}
										</span>
									</span>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleSendTest}
									disabled={sendingTest}
									className="self-start"
								>
									{sendingTest ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Send className="h-3.5 w-3.5" />
									)}
									Send test email notification
								</Button>
							</div>

							{EMAIL_OPTIONS.map(({ key, label, description }) => (
								<NotificationRow
									key={key}
									label={label}
									description={description}
									checked={settings.email[key]}
									onChange={() => toggleEmailOption(key)}
								/>
							))}
						</>
					)}
				</div>
			</SectionBlock>

			<SectionBlock
				title="System notifications"
				description="Choose which in-app notifications you want to receive."
			>
				<div className="divide-y divide-border">
					{SYSTEM_OPTIONS.map(({ key, label, description }) => (
						<NotificationRow
							key={key}
							label={label}
							description={description}
							checked={settings.system[key] !== false}
							onChange={() => toggleSystemOption(key)}
						/>
					))}
				</div>
			</SectionBlock>
		</div>
	);
}
