import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CalendarDays, KeyRound, Mail, Palette, ShieldCheck, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getProfile, type Profile } from "@/services/profile.service";
import { ProfilePersonalSection } from "@/components/profile/ProfilePersonalSection";
import { ProfileApiKeysSection } from "@/components/profile/ProfileApiKeysSection";
import { ProfileAppearanceSection } from "@/components/profile/ProfileAppearanceSection";
import { ProfileNotificationsSection } from "@/components/profile/ProfileNotificationsSection";

const STATUS_VARIANT: Record<string, string> = {
	active: "bg-success-subtle text-success border-success/20",
	invited: "bg-accent-subtle text-accent border-accent/20",
	disabled: "bg-danger-subtle text-danger border-danger/20",
};

const ROLE_VARIANT: Record<string, string> = {
	admin: "bg-primary-subtle text-primary border-primary/20",
	manager: "bg-accent-subtle text-accent border-accent/20",
	developer: "bg-success-subtle text-success border-success/20",
	user: "bg-muted-subtle text-muted-foreground border-border",
};

type TabId = "personal" | "appearance" | "notifications" | "api-keys";

const TABS: { id: TabId; label: string; icon: typeof UserCog }[] = [
	{ id: "personal", label: "Personal Info", icon: UserCog },
	{ id: "appearance", label: "Appearance", icon: Palette },
	{ id: "notifications", label: "Notifications", icon: Bell },
	{ id: "api-keys", label: "API Keys", icon: KeyRound },
];

function getInitials(name: string | null, email: string): string {
	if (name) {
		return name
			.split(" ")
			.map((p) => p[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}
	return email.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

export default function ProfilePage() {
	const { user } = useAuth();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<TabId>("personal");

	useEffect(() => {
		if (!user?.id) return;
		setLoading(true);
		getProfile(user.id)
			.then((p) => setProfile(p))
			.catch(() => toast.error("Failed to load profile."))
			.finally(() => setLoading(false));
	}, [user?.id]);

	if (loading) {
		return (
			<div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 sm:py-8 md:px-6">
				<div className="mb-6">
					<Skeleton className="h-7 w-32" />
					<Skeleton className="mt-1 h-4 w-56" />
				</div>
				<div className="space-y-4 sm:space-y-6">
					<Card className="overflow-hidden p-0">
						<Skeleton className="h-20 w-full rounded-none sm:h-28" />
						<div className="flex items-end gap-4 px-4 pb-4 sm:px-6 sm:pb-6">
							<Skeleton className="-mt-10 h-20 w-20 rounded-full border-4 border-card sm:-mt-14 sm:h-28 sm:w-28" />
							<div className="space-y-2 pb-1">
								<Skeleton className="h-5 w-36" />
								<Skeleton className="h-4 w-48" />
							</div>
						</div>
					</Card>
					<Card className="p-4 sm:p-6">
						<Skeleton className="mb-4 h-5 w-40" />
						<div className="space-y-4">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-24" />
						</div>
					</Card>
				</div>
			</div>
		);
	}

	if (!profile) return null;

	const initials = getInitials(profile.full_name, profile.email);
	const displayName = profile.full_name ?? profile.email.split("@")[0];

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 sm:py-8 md:px-6">
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-foreground">Profile</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Manage your personal information and API access
				</p>
			</div>

			<div className="space-y-4 sm:space-y-6">
				<Card className="overflow-hidden p-0">
					<div className="h-20 w-full bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 sm:h-28" />
					<div className="flex flex-col gap-4 px-4 pb-4 sm:px-6 sm:pb-6 md:flex-row md:items-end md:justify-between">
						<div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-end md:gap-4 md:text-left">
							<Avatar className="-mt-10 h-20 w-20 border-4 border-card text-xl sm:-mt-14 sm:h-28 sm:w-28">
								{profile.avatar_url && (
									<AvatarImage src={profile.avatar_url} alt={displayName} />
								)}
								<AvatarFallback className="text-2xl">
									{initials}
								</AvatarFallback>
							</Avatar>

							<div className="min-w-0 md:pb-1">
								<p className="text-lg font-semibold text-foreground sm:text-xl">
									{displayName}
								</p>
								<p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground md:justify-start">
									<Mail className="h-3 w-3 shrink-0" />
									<span className="break-all">{profile.email}</span>
								</p>
							</div>
						</div>

						<div className="flex flex-col items-center gap-2 md:items-end md:pb-1">
							<div className="flex flex-wrap justify-center gap-2 md:justify-end">
								<span
									className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_VARIANT[profile.role] ?? ROLE_VARIANT.user}`}
								>
									<ShieldCheck className="h-3 w-3" />
									{profile.role}
								</span>
								<span
									className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_VARIANT[profile.status] ?? STATUS_VARIANT.active}`}
								>
									{profile.status}
								</span>
							</div>

							{profile.created_at && (
								<p className="flex items-center gap-1 text-xs text-muted-foreground">
									<CalendarDays className="h-3 w-3" />
									Joined {formatDate(profile.created_at)}
								</p>
							)}
						</div>
					</div>
				</Card>

				<div className="space-y-4 min-w-0">
					<div className="flex gap-1 border-b border-border overflow-x-auto">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveTab(id)}
								className={cn(
									"flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap",
									activeTab === id
										? "border-primary text-primary font-medium"
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								{label}
							</button>
						))}
					</div>

					{activeTab === "personal" && (
						<ProfilePersonalSection
							profile={profile}
							onProfileChange={setProfile}
						/>
					)}
					{activeTab === "appearance" && <ProfileAppearanceSection />}
					{activeTab === "notifications" && <ProfileNotificationsSection />}
					{activeTab === "api-keys" && <ProfileApiKeysSection />}
				</div>
			</div>
		</div>
	);
}
