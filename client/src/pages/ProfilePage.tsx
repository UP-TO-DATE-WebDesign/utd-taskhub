import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, KeyRound, Mail, ShieldCheck, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getProfile, type Profile } from "@/services/profile.service";
import { ProfilePersonalSection } from "@/components/profile/ProfilePersonalSection";
import { ProfileApiKeysSection } from "@/components/profile/ProfileApiKeysSection";

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

type TabId = "personal" | "api-keys";

const TABS: { id: TabId; label: string; icon: typeof UserCog }[] = [
	{ id: "personal", label: "Personal Info", icon: UserCog },
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
			<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-5 md:px-6">
				<div className="mb-6">
					<Skeleton className="h-7 w-32" />
					<Skeleton className="mt-1 h-4 w-56" />
				</div>
				<div className="grid gap-6 md:grid-cols-[280px_1fr]">
					<Card className="flex flex-col items-center gap-4 p-6">
						<Skeleton className="h-20 w-20 rounded-full" />
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-5 w-20 rounded-full" />
					</Card>
					<Card className="p-6">
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
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-5 md:px-6">
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-foreground">Profile</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Manage your personal information and API access
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-[280px_1fr]">
				<Card className="flex flex-col items-center gap-3 p-6 text-center">
					<Avatar className="h-20 w-20 text-xl">
						{profile.avatar_url && (
							<AvatarImage src={profile.avatar_url} alt={displayName} />
						)}
						<AvatarFallback className="text-lg">
							{initials}
						</AvatarFallback>
					</Avatar>

					<div>
						<p className="text-base font-semibold text-foreground">
							{displayName}
						</p>
						<p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
							<Mail className="h-3 w-3" />
							{profile.email}
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-2">
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
				</Card>

				<div className="space-y-4">
					<div className="flex gap-1 border-b border-border">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveTab(id)}
								className={cn(
									"flex items-center gap-1.5 px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
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
					{activeTab === "api-keys" && <ProfileApiKeysSection />}
				</div>
			</div>
		</div>
	);
}
