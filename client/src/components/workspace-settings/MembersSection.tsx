import { useState, useEffect, useCallback } from "react";
import {
	Loader2,
	MoreHorizontal,
	Plus,
	ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
	listUsers,
	updateUserRole,
	type UserProfile,
} from "@/services/user.service";
import { listRoles, type Role } from "@/services/role.service";
import { toast } from "sonner";
import { SectionBlock } from "./SectionBlock";
import { getPermissionsForRole, ROLE_COLUMNS, type RoleKey } from "./rolePermissionsData";
import { PermissionGate } from "@/components/PermissionGate";

function getInitials(name: string | null): string {
	if (!name) return "?";
	return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function ManageRoleDialog({
	user,
	open,
	onClose,
	onUpdated,
	roles,
	loadingRoles,
}: {
	user: UserProfile | null;
	open: boolean;
	onClose: () => void;
	onUpdated: () => void;
	roles: Role[];
	loadingRoles: boolean;
}) {
	const [selectedRoleKey, setSelectedRoleKey] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setSelectedRoleKey(user?.global_role?.key ?? user?.role ?? "");
	}, [open, user]);

	const selectedRole = roles.find((r) => r.key === selectedRoleKey);
	const roleOptions: SearchableSelectOption[] = roles.map((r) => ({
		value: r.key,
		label: r.name,
		description: r.description ?? undefined,
	}));

	async function handleSave() {
		if (!user || !selectedRoleKey) return;
		setSaving(true);
		try {
			await updateUserRole(user.id, selectedRoleKey);
			toast.success("Role updated", {
				description: `${user.full_name ?? user.email} is now ${selectedRole?.name ?? selectedRoleKey}`,
			});
			onUpdated();
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to update role.";
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
			<DialogContent className="max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Manage Role</DialogTitle>
					<DialogDescription>
						Assign a global role to this user. Permissions are inherited from the role.
					</DialogDescription>
				</DialogHeader>

				{user && (
					<div className="flex items-center gap-3 py-1">
						<Avatar className="h-9 w-9">
							<AvatarFallback className="text-xs bg-primary text-primary-foreground">
								{getInitials(user.full_name)}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="text-sm font-medium text-foreground leading-none">
								{user.full_name ?? "Unknown"}
							</p>
							<p className="text-xs text-muted mt-0.5">{user.email}</p>
						</div>
					</div>
				)}

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Role
						</label>
						{loadingRoles ? (
							<div className="flex items-center gap-2 text-muted py-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span className="text-sm">Loading roles...</span>
							</div>
						) : (
							<SearchableSelect
								value={selectedRoleKey}
								onValueChange={setSelectedRoleKey}
								options={roleOptions}
								placeholder="Select a role"
							/>
						)}
					</div>

					{selectedRoleKey && (() => {
						const roleCol = ROLE_COLUMNS.find((c) => c.key === selectedRoleKey);
						const permGroups = getPermissionsForRole(selectedRoleKey as RoleKey);
						const totalCount = permGroups.reduce((n, g) => n + g.features.length, 0);
						return (
							<div>
								<div className="flex items-center gap-1.5 mb-2">
									<ShieldCheck className="h-3.5 w-3.5 text-muted" />
									<label className="text-sm font-medium text-muted-foreground">
										Permissions ({totalCount})
									</label>
									{roleCol && (
										<Badge
											variant={roleCol.variant as Parameters<typeof Badge>[0]["variant"]}
											className="ml-auto text-[11px] font-medium"
										>
											{roleCol.label}
										</Badge>
									)}
								</div>
								{totalCount === 0 ? (
									<p className="text-xs text-muted">No permissions assigned to this role.</p>
								) : (
									<div className="border border-border rounded-md max-h-[220px] overflow-y-auto">
										{permGroups.map((group) => (
											<div key={group.module}>
												<div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted-subtle/60 border-b border-border sticky top-0">
													<group.icon className="h-3 w-3 text-primary shrink-0" />
													<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
														{group.module}
													</span>
												</div>
												{group.features.map(({ feature, level }) => (
													<div
														key={feature}
														className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-0"
													>
														<span className="text-xs text-foreground">{feature}</span>
														{level.type === "full" ? (
															<span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary shrink-0">
																<ShieldCheck className="h-3 w-3" />
																Full
															</span>
														) : (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warning-subtle text-warning border border-warning/20 shrink-0 whitespace-nowrap">
																{level.label}
															</span>
														)}
													</div>
												))}
											</div>
										))}
									</div>
								)}
							</div>
						);
					})()}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={saving}>Cancel</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={saving || !selectedRoleKey}>
						{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function MembersSection() {
	const [members, setMembers] = useState<UserProfile[]>([]);
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [roleDialogUser, setRoleDialogUser] = useState<UserProfile | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);
	const [loadingRoles, setLoadingRoles] = useState(false);

	const fetchMembers = useCallback(async () => {
		setLoadingMembers(true);
		try {
			const data = await listUsers();
			setMembers(data);
		} catch {
			toast.error("Failed to load members.");
		} finally {
			setLoadingMembers(false);
		}
	}, []);

	useEffect(() => {
		fetchMembers();
		setLoadingRoles(true);
		listRoles("global")
			.then(setRoles)
			.catch(() => toast.error("Failed to load roles."))
			.finally(() => setLoadingRoles(false));
	}, [fetchMembers]);

	return (
		<>
			<SectionBlock
				title="Members & Roles"
				description="Manage your team's access levels."
			>
				<div className="flex items-center justify-between mb-4">
					<div />
					<PermissionGate feature="Invite users">
						<Button size="sm">
							<Plus className="h-3.5 w-3.5" />
							Invite Member
						</Button>
					</PermissionGate>
				</div>
				<div className="rounded-lg border border-border overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted-subtle">
								{["Member", "Role", "Status", "Action"].map((h, i) => (
									<th
										key={h}
										className={cn(
											"px-4 py-2.5 text-xs font-medium text-muted",
											i === 3 ? "text-right" : "text-left",
										)}
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{loadingMembers && (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center">
										<div className="flex items-center justify-center gap-2 text-muted">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-sm">Loading members...</span>
										</div>
									</td>
								</tr>
							)}
							{!loadingMembers && members.length === 0 && (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
										No members found.
									</td>
								</tr>
							)}
							{!loadingMembers && members.map((m) => (
								<tr
									key={m.id}
									className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
								>
									<td className="px-4 py-3">
										<div className="flex items-center gap-2.5">
											<Avatar className="h-7 w-7">
												<AvatarFallback className="text-[10px]">
													{getInitials(m.full_name)}
												</AvatarFallback>
											</Avatar>
											<div>
												<p className="text-sm font-medium text-foreground leading-none">
													{m.full_name ?? "Unknown"}
												</p>
												<p className="text-xs text-muted mt-0.5">{m.email}</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={
												(m.global_role?.key ?? m.role) === "admin"
													? "in-progress"
													: "backlog"
											}
											className="text-xs capitalize"
										>
											{m.global_role?.name ?? m.role}
										</Badge>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center gap-1.5">
											<span className={cn(
												"h-1.5 w-1.5 rounded-full shrink-0",
												m.status === "active" ? "bg-secondary" : "bg-muted",
											)} />
											<span className="text-sm text-muted-foreground capitalize">
												{m.status}
											</span>
										</div>
									</td>
									<td className="px-4 py-3 text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button className="text-muted hover:text-foreground transition-colors p-1 rounded">
													<MoreHorizontal className="h-4 w-4" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<PermissionGate feature="Manage role permissions">
													<DropdownMenuItem
														className="flex items-center gap-2"
														onSelect={() => setRoleDialogUser(m)}
													>
														<ShieldCheck className="h-3.5 w-3.5" />
														Manage Roles
													</DropdownMenuItem>
												</PermissionGate>
											</DropdownMenuContent>
										</DropdownMenu>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</SectionBlock>

			<ManageRoleDialog
				user={roleDialogUser}
				open={roleDialogUser !== null}
				onClose={() => setRoleDialogUser(null)}
				onUpdated={fetchMembers}
				roles={roles}
				loadingRoles={loadingRoles}
			/>
		</>
	);
}
