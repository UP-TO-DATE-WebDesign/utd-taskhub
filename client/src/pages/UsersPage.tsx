import { useState, useEffect, useCallback } from "react";
import {
	UserPlus,
	Mail,
	LayoutGrid,
	List,
	Search,
	Loader2,
	X,
	Users,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	listUsers,
	inviteUser,
	listUserInvitations,
	cancelUserInvitation,
	deleteUser,
	type UserProfile,
	type UserInvitation,
} from "@/services/user.service";
import { listRoles, type Role } from "@/services/role.service";
import { toast } from "sonner";
import { UsersPageSkeleton } from "@/components/users/UsersPageSkeleton";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
	"bg-primary",
	"bg-accent",
	"bg-secondary",
	"bg-warning",
	"bg-danger",
];

function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

function avatarColor(index: number): string {
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserCard({
	user,
	index,
	onDelete,
}: {
	user: UserProfile;
	index: number;
	onDelete: (user: UserProfile) => void;
}) {
	return (
		<Card
			className="p-5 flex flex-col gap-4"
			key={`index-${user.id}-${index}`}
		>
			<div className="flex items-center gap-3">
				<Avatar className="h-10 w-10">
					<AvatarImage
						src={user.avatar_url ?? undefined}
						alt={user.full_name ?? user.email}
					/>
					<AvatarFallback
						className={`text-sm text-white ${avatarColor(String(user.full_name)?.length)}`}
					>
						{getInitials(user.full_name)}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-foreground truncate">
						{user.full_name ?? "Unknown"}
					</p>
					<p className="text-xs text-muted truncate">{user.email}</p>
				</div>
				<button
					onClick={() => onDelete(user)}
					className="shrink-0 p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors"
					title="Delete user"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Badge
						variant={user.role === "admin" ? "medium" : "default"}
						className="capitalize"
					>
						{user.role}
					</Badge>
					<Badge
						variant={user.status === "active" ? "done" : "todo"}
						className="capitalize"
					>
						{user.status}
					</Badge>
				</div>
				<span className="text-[10px] text-muted">
					{formatDate(user.created_at)}
				</span>
			</div>
		</Card>
	);
}

function UserRow({
	user,
	onDelete,
}: {
	user: UserProfile;
	onDelete: (user: UserProfile) => void;
}) {
	return (
		<tr className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors">
			<td className="px-5 py-3.5">
				<div className="flex items-center gap-3">
					<Avatar className="h-7 w-7">
						<AvatarImage
							src={user.avatar_url ?? undefined}
							alt={user.full_name ?? user.email}
						/>
						<AvatarFallback
							className={`text-[10px] text-white ${avatarColor(String(user.full_name)?.length)}`}
						>
							{getInitials(user.full_name)}
						</AvatarFallback>
					</Avatar>
					<div>
						<p className="text-sm font-medium text-foreground">
							{user.full_name ?? "Unknown"}
						</p>
						<p className="text-xs text-muted">{user.email}</p>
					</div>
				</div>
			</td>
			<td className="px-4 py-3.5">
				<Badge
					variant={user.role === "admin" ? "medium" : "default"}
					className="capitalize"
				>
					{user.role}
				</Badge>
			</td>
			<td className="px-4 py-3.5">
				<Badge
					variant={user.status === "active" ? "done" : "todo"}
					className="capitalize"
				>
					{user.status}
				</Badge>
			</td>
			<td className="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
				{formatDate(user.created_at)}
			</td>
			<td className="px-4 py-3.5 text-right">
				<button
					onClick={() => onDelete(user)}
					className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors"
					title="Delete user"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</td>
		</tr>
	);
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
	user,
	onClose,
	onDeleted,
}: {
	user: UserProfile | null;
	onClose: () => void;
	onDeleted: (id: string) => void;
}) {
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		if (!user) return;
		setDeleting(true);
		try {
			await deleteUser(user.id);
			toast.success("User deleted", { description: user.email });
			onDeleted(user.id);
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to delete user.";
			toast.error(msg);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<Dialog
			open={!!user}
			onOpenChange={(val) => {
				if (!val) onClose();
			}}
		>
			<DialogContent className="max-w-[400px]">
				<DialogHeader>
					<DialogTitle>Delete User</DialogTitle>
					<DialogDescription>
						This will permanently delete{" "}
						<span className="font-medium text-foreground">
							{user?.full_name ?? user?.email}
						</span>{" "}
						and remove them from all projects. This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={deleting}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleting}
						className="bg-danger text-white hover:bg-danger/90"
					>
						{deleting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Invite Dialog ─────────────────────────────────────────────────────────────

function InviteDialog({
	open,
	onClose,
	onInvited,
}: {
	open: boolean;
	onClose: () => void;
	onInvited: () => void;
}) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("");
	const [roles, setRoles] = useState<Role[]>([]);
	const [loadingRoles, setLoadingRoles] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!open) return;
		setLoadingRoles(true);
		listRoles("global")
			.then((data) => {
				setRoles(data);
				setRole((prev) => prev || data[0]?.key || "");
			})
			.catch(() => toast.error("Failed to load roles."))
			.finally(() => setLoadingRoles(false));
	}, [open]);

	async function handleSubmit() {
		if (!email.trim()) {
			setError("Email is required.");
			return;
		}
		setSubmitting(true);
		setError("");
		try {
			await inviteUser(email.trim().toLowerCase(), role);
			toast.success("Invitation sent", {
				description: email.trim().toLowerCase(),
			});
			setEmail("");
			setRole(roles[0]?.key || "");
			onInvited();
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to send invitation.";
			setError(msg);
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(val: boolean) {
		if (!val) {
			setEmail("");
			setRole(roles[0]?.key || "");
			setError("");
		}
		if (!val) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[420px]">
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
					<DialogDescription>
						Send a platform invitation via email.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Email <span className="text-danger">*</span>
						</label>
						<Input
							type="email"
							placeholder="user@example.com"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								setError("");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleSubmit();
							}}
							className={
								error ? "border-danger focus:ring-danger" : ""
							}
						/>
						{error && (
							<p className="text-xs text-danger mt-1">{error}</p>
						)}
					</div>
					<div className="">
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Role
						</label>
						{loadingRoles ? (
							<div className="flex items-center gap-2 text-muted py-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span className="text-sm">
									Loading roles...
								</span>
							</div>
						) : (
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger>
									<SelectValue placeholder="Select a role" />
								</SelectTrigger>
								<SelectContent>
									{roles.map((r) => (
										<SelectItem key={r.key} value={r.key}>
											<span className="font-medium">
												{r.name}
											</span>
											{r.description && (
												<span className="ml-2 text-xs text-muted-foreground">
													{r.description}
												</span>
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleSubmit}
						disabled={submitting || loadingRoles}
					>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Send Invite
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Invitations Dialog ────────────────────────────────────────────────────────

function InvitationsDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [tab, setTab] = useState<"pending" | "cancelled">("pending");
	const [invitations, setInvitations] = useState<UserInvitation[]>([]);
	const [loading, setLoading] = useState(false);
	const [cancelling, setCancelling] = useState<string | null>(null);
	const [resending, setResending] = useState<boolean>(false);

	const fetchInvitations = useCallback(async () => {
		setLoading(true);
		try {
			const data = await listUserInvitations(tab);
			setInvitations(data);
		} catch {
			toast.error("Failed to load invitations.");
		} finally {
			setLoading(false);
		}
	}, [tab]);

	useEffect(() => {
		if (open) fetchInvitations();
	}, [open, fetchInvitations]);

	async function handleResend(inv: { email: string; role: string }) {
		setResending(true);
		try {
			await inviteUser(inv.email, inv.role);
			toast.success("Invitation resent", {
				description: inv.email,
			});
			fetchInvitations();
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to resend invitation.";
			toast.error(msg);
		} finally {
			setResending(false);
		}
	}

	async function handleCancel(userId: string) {
		setCancelling(userId);
		try {
			await cancelUserInvitation(userId);
			toast.success("Invitation cancelled.");
			fetchInvitations();
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to cancel invitation.";
			toast.error(msg);
		} finally {
			setCancelling(null);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				if (!val) onClose();
			}}
		>
			<DialogContent className="max-w-[560px]">
				<DialogHeader>
					<DialogTitle>Invitations</DialogTitle>
					<DialogDescription>
						Platform invitations sent by admins.
					</DialogDescription>
				</DialogHeader>

				{/* Tabs */}
				<div className="flex items-center gap-1 border border-border rounded-xl px-2 py-1 bg-surface w-fit">
					{(["pending", "cancelled"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={cn(
								"px-3 py-1 text-xs rounded-xl transition-colors capitalize",
								tab === t
									? "bg-primary text-primary-foreground font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-muted-subtle",
							)}
						>
							{t}
						</button>
					))}
				</div>

				<div className="min-h-[200px] mt-4">
					{loading && (
						<div className="flex items-center justify-center py-12 gap-2 text-muted">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading...</span>
						</div>
					)}

					{!loading && invitations.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Mail className="h-8 w-8 text-border-strong mb-3" />
							<p className="text-sm font-medium text-foreground">
								No {tab} invitations
							</p>
						</div>
					)}

					{!loading && invitations.length > 0 && (
						<div className="border border-border rounded-lg overflow-hidden">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border bg-muted-subtle">
										<th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
											Email
										</th>
										<th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
											{tab === "pending"
												? "Invited"
												: "Cancelled"}
										</th>
										{tab === "pending" && (
											<th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted" />
										)}
									</tr>
								</thead>
								<tbody>
									{invitations.map((inv) => (
										<tr
											key={inv.id}
											className="border-b border-border last:border-0"
										>
											<td className="px-4 py-3 text-sm text-foreground">
												{inv.email}
											</td>
											<td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
												{formatDate(
													tab === "pending"
														? inv.invited_at
														: inv.invite_cancelled_at!,
												)}
											</td>
											{tab === "pending" && (
												<td className="px-4 py-3 text-right ">
													<div className="flex items-center justify-center gap-3">
														<Button
															onClick={() =>
																handleResend({
																	email: inv.email,
																	role: inv.role,
																})
															}
															size="sm"
															disabled={resending}
														>
															Resend
														</Button>
														<button
															onClick={() =>
																handleCancel(
																	inv.id,
																)
															}
															disabled={
																cancelling ===
																inv.id
															}
															className="inline-flex items-center gap-1 text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
														>
															{cancelling ===
															inv.id ? (
																<Loader2 className="h-3 w-3 animate-spin" />
															) : (
																<X className="h-3 w-3" />
															)}
															Cancel
														</button>
													</div>
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
	const [users, setUsers] = useState<UserProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [view, setView] = useState<"grid" | "list">("grid");
	const [inviteOpen, setInviteOpen] = useState(false);
	const [invitationsOpen, setInvitationsOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

	const fetchUsers = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await listUsers();
			setUsers(data);
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to load users.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const filtered = users.filter((u) => {
		const q = search.toLowerCase();
		return (
			(u.full_name ?? "").toLowerCase().includes(q) ||
			u.email.toLowerCase().includes(q)
		);
	});

	return (
		<div className="mx-auto max-w-[1280px] px-6 py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						Users
					</h1>
					<p className="text-sm text-muted mt-1">
						{users.length} member{users.length !== 1 ? "s" : ""}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						className="flex items-center gap-2"
						onClick={() => setInvitationsOpen(true)}
					>
						<Mail className="h-4 w-4" />
						View Invitations
					</Button>
					<Button
						className="flex items-center gap-2"
						onClick={() => setInviteOpen(true)}
					>
						<UserPlus className="h-4 w-4" />
						Invite User
					</Button>
				</div>
			</div>

			{/* Search + View toggle */}
			<div className="flex items-center justify-between gap-4 mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
					<Input
						placeholder="Search users..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8 w-64 h-9 text-sm"
					/>
				</div>

				<div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface">
					<button
						onClick={() => setView("grid")}
						className={cn(
							"p-2 transition-colors",
							view === "grid"
								? "bg-primary text-primary-foreground"
								: "text-muted hover:text-foreground hover:bg-muted-subtle",
						)}
					>
						<LayoutGrid className="h-4 w-4" />
					</button>
					<button
						onClick={() => setView("list")}
						className={cn(
							"p-2 transition-colors",
							view === "list"
								? "bg-primary text-primary-foreground"
								: "text-muted hover:text-foreground hover:bg-muted-subtle",
						)}
					>
						<List className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Loading */}
			{loading && <UsersPageSkeleton view={view} />}

			{/* Error */}
			{!loading && error && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-base font-medium text-foreground mb-1">
						Something went wrong
					</p>
					<p className="text-sm text-muted mb-4">{error}</p>
					<Button variant="outline" onClick={fetchUsers}>
						Retry
					</Button>
				</div>
			)}

			{/* Empty */}
			{!loading && !error && filtered.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<Users className="h-10 w-10 text-border-strong mb-4" />
					<p className="text-base font-medium text-foreground mb-1">
						No users found
					</p>
					<p className="text-sm text-muted">
						Try adjusting your search.
					</p>
				</div>
			)}

			{/* Grid view */}
			{!loading && !error && view === "grid" && filtered.length > 0 && (
				<div className="grid grid-cols-3 gap-4">
					{filtered.map((u, i) => (
						<UserCard
							key={u.id}
							user={u}
							index={i}
							onDelete={setDeleteTarget}
						/>
					))}
				</div>
			)}

			{/* List view */}
			{!loading && !error && view === "list" && filtered.length > 0 && (
				<Card className="p-0 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border">
								{["User", "Role", "Status", "Joined", ""].map(
									(h, i) => (
										<th
											key={h + i}
											className={cn(
												"px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted",
												i === 0
													? "pl-5 text-left"
													: "text-left",
											)}
										>
											{h}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody>
							{filtered.map((u) => (
								<UserRow
									key={u.id}
									user={u}
									onDelete={setDeleteTarget}
								/>
							))}
						</tbody>
					</table>
				</Card>
			)}

			<InviteDialog
				open={inviteOpen}
				onClose={() => setInviteOpen(false)}
				onInvited={fetchUsers}
			/>

			<InvitationsDialog
				open={invitationsOpen}
				onClose={() => setInvitationsOpen(false)}
			/>

			<DeleteConfirmDialog
				user={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onDeleted={(id) =>
					setUsers((prev) => prev.filter((u) => u.id !== id))
				}
			/>
		</div>
	);
}
