import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	updateProject,
	type Project,
	type ProjectStatus,
} from "@/services/project.service";
import { toast } from "sonner";
import { addMember, removeMember } from "@/services/project-member.service";
import { type Profile } from "@/services/profile.service";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import {
	DEFAULT_PROJECT_ICON,
	type ProjectIconType,
} from "@/components/projects/project-icon-options";
import { cn } from "@/lib/utils";
import { getInitials, avatarColor } from "./utils";

const EDIT_EMPTY = {
	name: "",
	status: "planning" as ProjectStatus,
	iconType: "icon" as ProjectIconType,
	iconValue: DEFAULT_PROJECT_ICON,
	sprint: "",
	sprintEnds: "",
	description: "",
	tagInput: "",
	tags: [] as string[],
	memberIds: [] as string[],
};

export function EditProjectDialog({
	open,
	onClose,
	project,
	profiles,
	onSaved,
}: {
	open: boolean;
	onClose: () => void;
	project: Project;
	profiles: Profile[];
	onSaved: (updated: Project) => void;
}) {
	const [form, setForm] = useState(EDIT_EMPTY);
	const [initialMemberIds, setInitialMemberIds] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<{ name?: string; submit?: string }>(
		{},
	);

	useEffect(() => {
		if (!open) return;
		const ids = project.project_members.map((m) => m.user_id);
		setInitialMemberIds(ids);
		setForm({
			name: project.name,
			status: project.status,
			iconType: project.icon_type ?? "icon",
			iconValue: project.icon_value ?? DEFAULT_PROJECT_ICON,
			sprint: project.sprint_name ?? "",
			sprintEnds: project.sprint_end_date
				? project.sprint_end_date.slice(0, 10)
				: "",
			description: project.description ?? "",
			tagInput: "",
			tags: [...(project.tags ?? [])],
			memberIds: [...ids],
		});
		setErrors({});
	}, [open, project]);

	function set<K extends keyof typeof EDIT_EMPTY>(
		key: K,
		value: (typeof EDIT_EMPTY)[K],
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (key === "name") setErrors((prev) => ({ ...prev, name: undefined }));
	}

	function addTag() {
		const tag = form.tagInput.trim();
		if (!tag || form.tags.includes(tag)) {
			set("tagInput", "");
			return;
		}
		set("tags", [...form.tags, tag]);
		set("tagInput", "");
	}

	function removeTag(tag: string) {
		set(
			"tags",
			form.tags.filter((t) => t !== tag),
		);
	}

	function toggleMember(id: string) {
		if (id === project.created_by) return;
		set(
			"memberIds",
			form.memberIds.includes(id)
				? form.memberIds.filter((i) => i !== id)
				: [...form.memberIds, id],
		);
	}

	async function handleSubmit() {
		if (!form.name.trim()) {
			setErrors({ name: "Project name is required." });
			return;
		}
		if (form.iconType === "image" && form.iconValue.length > 1_000_000) {
			setErrors({
				submit: "Icon image is too large. Please upload a smaller image.",
			});
			return;
		}
		setSubmitting(true);
		setErrors({});
		try {
			const updated = await updateProject(project.id, {
				name: form.name.trim(),
				description: projectDescriptionText(form.description)
					? form.description
					: "",
				status: form.status,
				icon_type: form.iconType,
				icon_value: form.iconValue,
				sprint_name: form.sprint.trim() || undefined,
				sprint_end_date: form.sprintEnds || undefined,
				tags: form.tags,
			});

			const toAdd = form.memberIds.filter(
				(id) => !initialMemberIds.includes(id),
			);
			const toRemove = initialMemberIds.filter(
				(id) =>
					!form.memberIds.includes(id) && id !== project.created_by,
			);

			await Promise.all([
				...toAdd.map((uid) => addMember(project.id, uid)),
				...toRemove.map((uid) => removeMember(project.id, uid)),
			]);

			onSaved(updated);
			onClose();
			toast.success("Project updated", { description: updated.name });
		} catch {
			toast.error("Failed to update project", {
				description: "Please try again.",
			});
			setErrors({ submit: "Failed to save changes. Please try again." });
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[560px]">
				<DialogHeader>
					<DialogTitle>Edit Project</DialogTitle>
					<DialogDescription>
						Update the project details.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{/* Name */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Project Name <span className="text-danger">*</span>
						</label>
						<Input
							value={form.name}
							onChange={(e) => set("name", e.target.value)}
							className={errors.name ? "border-danger" : ""}
						/>
						{errors.name && (
							<p className="text-xs text-danger mt-1">
								{errors.name}
							</p>
						)}
					</div>

					{/* Status + Sprint Name */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<Select
								value={form.status}
								onValueChange={(v) =>
									set("status", v as ProjectStatus)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="planning">
										Planning
									</SelectItem>
									<SelectItem value="in-progress">
										In Progress
									</SelectItem>
									<SelectItem value="on-hold">
										On Hold
									</SelectItem>
									<SelectItem value="completed">
										Completed
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Sprint Name
							</label>
							<Input
								placeholder="e.g. Sprint 1 Alpha"
								value={form.sprint}
								onChange={(e) => set("sprint", e.target.value)}
							/>
						</div>
					</div>

					{/* Sprint End Date + Tags */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Sprint End Date
							</label>
							<Input
								type="date"
								value={form.sprintEnds}
								onChange={(e) =>
									set("sprintEnds", e.target.value)
								}
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Tags
							</label>
							<div className="flex gap-2">
								<Input
									placeholder="Add tag..."
									value={form.tagInput}
									onChange={(e) =>
										set("tagInput", e.target.value)
									}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addTag();
										}
									}}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addTag}
									className="shrink-0"
								>
									Add
								</Button>
							</div>
							{form.tags.length > 0 && (
								<div className="flex flex-wrap gap-1.5 mt-2">
									{form.tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center gap-1 text-[11px] bg-muted-subtle text-muted-foreground px-2 py-0.5 rounded-full font-medium"
										>
											{tag}
											<button
												type="button"
												onClick={() => removeTag(tag)}
												className="text-muted hover:text-foreground transition-colors"
											>
												<X className="h-2.5 w-2.5" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Description */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Description
						</label>
						<ProjectDescriptionEditor
							value={form.description}
							onChange={(value) => set("description", value)}
						/>
					</div>

					{/* Team Members */}
					{profiles.length > 0 && (
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-2 block">
								Team Members
							</label>
							<div className="grid grid-cols-2 gap-2">
								{profiles.map((profile) => {
									const isOwner =
										profile.id === project.created_by;
									const checked = form.memberIds.includes(
										profile.id,
									);
									return (
										<label
											key={profile.id}
											className={cn(
												"flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
												isOwner
													? "opacity-60 cursor-not-allowed border-border"
													: checked
														? "border-primary bg-primary-subtle cursor-pointer"
														: "border-border hover:bg-muted-subtle cursor-pointer",
											)}
										>
											<Checkbox
												checked={checked}
												disabled={isOwner}
												onCheckedChange={() =>
													toggleMember(profile.id)
												}
											/>
											<Avatar className="h-6 w-6 shrink-0">
												<AvatarFallback
													className={`text-[9px] text-white ${avatarColor(String(profile.full_name)?.length)}`}
												>
													{getInitials(
														profile.full_name,
													)}
												</AvatarFallback>
											</Avatar>
											<span className="text-sm text-foreground truncate">
												{profile.full_name ??
													profile.email}
												{isOwner && (
													<span className="ml-1 text-[10px] text-muted">
														(owner)
													</span>
												)}
											</span>
										</label>
									);
								})}
							</div>
						</div>
					)}

					{errors.submit && (
						<p className="text-xs text-danger">{errors.submit}</p>
					)}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={handleSubmit} disabled={submitting}>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
