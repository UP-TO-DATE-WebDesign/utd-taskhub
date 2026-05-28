import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SectionBlock } from "@/components/workspace-settings/SectionBlock";
import {
	updateProject,
	type Project,
	type ProjectStatus,
	type UpdateProjectPayload,
} from "@/services/project.service";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";

type FormState = {
	name: string;
	key: string;
	slug: string;
	appDomain: string;
	status: ProjectStatus;
	description: string;
	tags: string[];
	tagInput: string;
};

function buildInitialForm(project: Project): FormState {
	return {
		name: project.name,
		key: project.key,
		slug: project.slug ?? "",
		appDomain: project.app_domain ?? "",
		status: project.status,
		description: project.description ?? "",
		tags: [...(project.tags ?? [])],
		tagInput: "",
	};
}

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((v, i) => v === b[i]);
}

export function GeneralSection({
	project,
	onSaved,
}: {
	project: Project;
	onSaved: (updated: Project) => void;
}) {
	const [form, setForm] = useState<FormState>(() => buildInitialForm(project));
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setForm(buildInitialForm(project));
	}, [project.id]);

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function addTag() {
		const tag = form.tagInput.trim();
		if (!tag || form.tags.includes(tag)) {
			setField("tagInput", "");
			return;
		}
		setForm((prev) => ({
			...prev,
			tags: [...prev.tags, tag],
			tagInput: "",
		}));
	}

	function removeTag(tag: string) {
		setField(
			"tags",
			form.tags.filter((t) => t !== tag),
		);
	}

	function buildDiff(): UpdateProjectPayload {
		const diff: UpdateProjectPayload = {};
		const trimmedName = form.name.trim();
		if (trimmedName !== project.name) diff.name = trimmedName;
		const trimmedKey = form.key.trim().toUpperCase();
		if (trimmedKey !== project.key) diff.key = trimmedKey;

		const trimmedSlug = form.slug.trim().toLowerCase();
		if (trimmedSlug !== (project.slug ?? "")) diff.slug = trimmedSlug;

		const trimmedDomain = form.appDomain.trim();
		if (trimmedDomain !== (project.app_domain ?? "")) {
			diff.app_domain = trimmedDomain || null;
		}

		if (form.status !== project.status) diff.status = form.status;

		const currentDesc = project.description ?? "";
		const nextDesc = projectDescriptionText(form.description)
			? form.description
			: "";
		if (nextDesc !== currentDesc) diff.description = nextDesc;

		const currentTags = project.tags ?? [];
		if (!arraysEqual(form.tags, currentTags)) diff.tags = form.tags;

		return diff;
	}

	async function handleSave() {
		const diff = buildDiff();
		if (Object.keys(diff).length === 0) {
			toast.message("No changes to save.");
			return;
		}
		if (diff.name !== undefined && diff.name.length === 0) {
			toast.error("Project name is required.");
			return;
		}
		if (diff.slug !== undefined && diff.slug.length === 0) {
			toast.error("Project slug is required.");
			return;
		}
		setSaving(true);
		try {
			const updated = await updateProject(project.id, diff);
			onSaved(updated);
			toast.success("Project settings saved.");
		} catch (err) {
			toast.error(
				(err as Error)?.message || "Failed to save project settings.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<SectionBlock
			title="General Settings"
			description="Update basic project info."
		>
			<div className="space-y-5">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Project Name <span className="text-danger">*</span>
						</label>
						<Input
							value={form.name}
							onChange={(e) => setField("name", e.target.value)}
							disabled={saving}
							className={
								form.name.trim().length === 0 ? "border-danger" : ""
							}
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Project Key
						</label>
						<Input
							value={form.key}
							onChange={(e) =>
								setField("key", e.target.value.toUpperCase())
							}
							disabled={saving}
							maxLength={10}
							className="font-mono uppercase"
						/>
						<p className="text-[11px] text-muted-foreground mt-1">
							Prefix for ticket codes (e.g. WEB-001).
						</p>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Project Slug
						</label>
						<Input
							value={form.slug}
							onChange={(e) =>
								setField(
									"slug",
									e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9-]/g, ""),
								)
							}
							disabled={saving}
							className="font-mono"
						/>
						<p className="text-[11px] text-muted-foreground mt-1">
							Used in the project URL (/projects/{form.slug ||
								"my-project"}).
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							App Domain
						</label>
						<Input
							placeholder="e.g. contentkit.uptodatesites.com"
							value={form.appDomain}
							onChange={(e) =>
								setField("appDomain", e.target.value)
							}
							disabled={saving}
						/>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Status
						</label>
						<SearchableSelect
							value={form.status}
							onValueChange={(v) =>
								setField("status", v as ProjectStatus)
							}
							disabled={saving}
							options={[
								{ value: "planning", label: "Planning" },
								{ value: "in-progress", label: "In Progress" },
								{ value: "on-hold", label: "On Hold" },
								{ value: "completed", label: "Completed" },
							]}
						/>
					</div>
				</div>

				<div>
					<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
						Description
					</label>
					<ProjectDescriptionEditor
						value={form.description}
						onChange={(value) => setField("description", value)}
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
							onChange={(e) => setField("tagInput", e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addTag();
								}
							}}
							disabled={saving}
							className="flex-1"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addTag}
							disabled={saving}
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
										disabled={saving}
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

			<div className="mt-5 flex justify-end">
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</SectionBlock>
	);
}
