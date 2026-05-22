import { useState } from "react";
import {
	Globe,
	Mail,
	Smartphone,
	MessageSquare,
	Bell,
	UserCircle,
	AtSign,
	Tag,
	Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionBlock, Toggle } from "./SectionBlock";

export function NotificationsSection() {
	const [notifEmail, setNotifEmail] = useState(true);
	const [notifPush, setNotifPush] = useState(true);
	const [notifSlack, setNotifSlack] = useState(false);
	const [digestFrequency, setDigestFrequency] = useState("daily");
	const [notifAssigned, setNotifAssigned] = useState(true);
	const [notifMentioned, setNotifMentioned] = useState(true);
	const [notifStatusChange, setNotifStatusChange] = useState(true);
	const [notifComment, setNotifComment] = useState(false);
	const [notifDue, setNotifDue] = useState(true);
	const [quietStart, setQuietStart] = useState("22:00");
	const [quietEnd, setQuietEnd] = useState("08:00");

	const channels = [
		{ label: "Email", sub: "baluma.joel91@gmail.com", icon: Mail, checked: notifEmail, toggle: () => setNotifEmail((v) => !v) },
		{ label: "Push", sub: "Browser & mobile", icon: Smartphone, checked: notifPush, toggle: () => setNotifPush((v) => !v) },
		{ label: "Slack", sub: "Connect Slack first", icon: MessageSquare, checked: notifSlack, toggle: () => setNotifSlack((v) => !v) },
	];

	const events = [
		{ label: "A task is assigned to me", icon: UserCircle, checked: notifAssigned, toggle: () => setNotifAssigned((v) => !v) },
		{ label: "I'm mentioned in a comment", icon: AtSign, checked: notifMentioned, toggle: () => setNotifMentioned((v) => !v) },
		{ label: "A task status changes", icon: Tag, checked: notifStatusChange, toggle: () => setNotifStatusChange((v) => !v) },
		{ label: "A new comment is posted", icon: MessageSquare, checked: notifComment, toggle: () => setNotifComment((v) => !v) },
		{ label: "A due date is approaching", icon: Clock, checked: notifDue, toggle: () => setNotifDue((v) => !v) },
	];

	return (
		<SectionBlock
			title="Notifications"
			description="Control when and how you receive updates from TaskHub."
		>
			<div className="space-y-6">
				<div>
					<p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
						<Globe className="h-4 w-4 text-primary" />
						Channels
					</p>
					<div className="grid grid-cols-3 gap-3">
						{channels.map(({ label, sub, icon: Icon, checked, toggle }) => (
							<div
								key={label}
								className={cn(
									"rounded-lg border p-4 flex flex-col gap-3 transition-colors",
									checked ? "border-primary bg-primary-subtle/40" : "border-border bg-surface",
								)}
							>
								<div className="flex items-center justify-between">
									<div
										className={cn(
											"h-8 w-8 rounded-lg flex items-center justify-center",
											checked ? "bg-primary-subtle" : "bg-muted-subtle",
										)}
									>
										<Icon
											className={cn(
												"h-4 w-4",
												checked ? "text-primary" : "text-muted-foreground",
											)}
										/>
									</div>
									<Toggle checked={checked} onChange={toggle} />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">{label}</p>
									<p className="text-xs text-muted mt-0.5">{sub}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				<Separator />

				<div>
					<p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
						<Bell className="h-4 w-4 text-primary" />
						Notify Me When
					</p>
					<div className="space-y-1">
						{events.map(({ label, icon: Icon, checked, toggle }) => (
							<div
								key={label}
								className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted-subtle transition-colors"
							>
								<div className="flex items-center gap-2.5">
									<Icon className="h-4 w-4 text-muted shrink-0" />
									<span className="text-sm text-foreground">{label}</span>
								</div>
								<Toggle checked={checked} onChange={toggle} />
							</div>
						))}
					</div>
				</div>

				<Separator />

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Email Digest
						</label>
						<SearchableSelect
							value={digestFrequency}
							onValueChange={setDigestFrequency}
							options={[
								{ value: "realtime", label: "Real-time" },
								{ value: "hourly", label: "Hourly" },
								{ value: "daily", label: "Daily summary" },
								{ value: "weekly", label: "Weekly summary" },
								{ value: "never", label: "Never" },
							]}
						/>
						<p className="text-[11px] text-muted mt-1.5">
							How often email summaries are sent.
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Quiet Hours
						</label>
						<div className="flex items-center gap-2">
							<Input
								type="time"
								value={quietStart}
								onChange={(e) => setQuietStart(e.target.value)}
								className="text-sm"
							/>
							<span className="text-xs text-muted shrink-0">to</span>
							<Input
								type="time"
								value={quietEnd}
								onChange={(e) => setQuietEnd(e.target.value)}
								className="text-sm"
							/>
						</div>
						<p className="text-[11px] text-muted mt-1.5">
							No push notifications during this window.
						</p>
					</div>
				</div>
			</div>
			<div className="mt-5 flex justify-end">
				<Button size="sm">Save Changes</Button>
			</div>
		</SectionBlock>
	);
}
