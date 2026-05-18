import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Project } from "@/services/project.service";
import { getInitials, avatarColor } from "./utils";

export function TeamAvatars({
	members,
}: {
	members: Project["project_members"];
}) {
	const visible = members.slice(0, 4);
	const extra = members.length - 4;
	return (
		<div className="flex items-center">
			{visible.map((m, i) => (
				<Avatar
					key={m.user_id}
					className={`h-9 w-9 border-2 border-surface ${i > 0 ? "-ml-3" : ""}`}
				>
					<AvatarImage
						src={m.profiles?.avatar_url ?? undefined}
						alt={m.profiles?.full_name ?? ""}
					/>
					<AvatarFallback
						className={`text-[10px] text-white ${avatarColor(String(m.profiles?.id)?.length)}`}
					>
						{getInitials(m.profiles?.full_name ?? null)}
					</AvatarFallback>
				</Avatar>
			))}
			{extra > 0 && (
				<div className="-ml-3 h-9 w-9 rounded-full bg-muted-subtle border-2 border-surface flex items-center justify-center text-xs font-medium text-muted">
					+{extra}
				</div>
			)}
		</div>
	);
}
