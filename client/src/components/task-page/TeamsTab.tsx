import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Project } from "@/services/project.service";
import { removeMember } from "@/services/project-member.service";
import { toast } from "sonner";
import { getInitials, avatarColor, formatDate } from "./utils";

export function TeamsTab({
	project,
	members,
	onAddMemberClick,
	onMemberRemoved,
}: {
	project: Project;
	members: Project["project_members"];
	onAddMemberClick: () => void;
	onMemberRemoved: (userId: string) => void;
}) {
	async function handleRemove(userId: string) {
		try {
			await removeMember(project.id, userId);
			onMemberRemoved(userId);
			toast.success("Member removed");
		} catch {
			toast.error("Failed to remove member");
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted">
					{members.length} member{members.length !== 1 ? "s" : ""}
				</p>
				<Button
					className="flex items-center gap-2"
					onClick={onAddMemberClick}
				>
					<Plus className="h-4 w-4" />
					Add Member
				</Button>
			</div>

			<Card className="p-0 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted-subtle/40">
							{["Member", "Email", "Role", "Joined"].map((h) => (
								<th
									key={h}
									className="px-5 py-3 text-xs font-medium text-muted text-left"
								>
									{h}
								</th>
							))}
							<th className="px-5 py-3" />
						</tr>
					</thead>
					<tbody>
						{members.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-5 py-10 text-center text-sm text-muted"
								>
									No members yet.
								</td>
							</tr>
						) : (
							members.map((m, i) => {
								const isOwner =
									m.user_id === project.created_by;
								return (
									<tr
										key={m.user_id}
										className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
									>
										<td className="px-5 py-4">
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8 shrink-0">
													<AvatarImage
														src={
															m.profiles
																?.avatar_url ??
															undefined
														}
														alt={
															m.profiles
																?.full_name ??
															""
														}
													/>
													<AvatarFallback
														className={`text-[10px] text-white ${avatarColor(String(m.profiles?.id)?.length)}`}
													>
														{getInitials(
															m.profiles
																?.full_name ??
																null,
														)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium text-foreground">
														{m.profiles
															?.full_name ??
															"Unknown"}
													</p>
													{isOwner && (
														<span className="text-[10px] text-muted">
															Owner
														</span>
													)}
												</div>
											</div>
										</td>
										<td className="px-5 py-4 text-sm text-muted">
											{m.profiles?.email ?? "—"}
										</td>
										<td className="px-5 py-4">
											<span className="capitalize text-sm text-foreground">
												{m.role}
											</span>
										</td>
										<td className="px-5 py-4 text-sm text-muted whitespace-nowrap">
											{formatDate(m.joined_at)}
										</td>
										<td className="px-5 py-4 text-right">
											{!isOwner && (
												<Button
													variant="outline"
													size="sm"
													className="text-danger border-danger/30 hover:bg-danger/5"
													onClick={() =>
														handleRemove(m.user_id)
													}
												>
													Remove
												</Button>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</Card>
		</div>
	);
}
