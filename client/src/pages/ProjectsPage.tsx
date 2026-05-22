import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	Plus,
	Search,
	LayoutGrid,
	List,
	ChevronRight,
	CheckCircle2,
	X,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	listProjects,
	createProject,
	type Project,
	type ProjectStatus,
} from "@/services/project.service";
import { addMember } from "@/services/project-member.service";
import { listProfiles, type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import {
	DEFAULT_PROJECT_ICON,
	type ProjectIconType,
} from "@/components/projects/project-icon-options";
import { ProjectIcon } from "@/components/projects/project-icon-picker";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiSWR } from "@/hooks/useApiSWR";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: ProjectStatus | "all" }[] = [
	{ label: "All", value: "all" },
	{ label: "In Progress", value: "in-progress" },
	{ label: "Planning", value: "planning" },
	{ label: "Completed", value: "completed" },
	{ label: "On Hold", value: "on-hold" },
];

const STATUS_BADGE: Record<
	ProjectStatus,
	{
		variant: "in-progress" | "todo" | "done" | "cancelled" | "backlog";
		label: string;
	}
> = {
	"in-progress": { variant: "in-progress", label: "In Progress" },
	planning: { variant: "todo", label: "Planning" },
	completed: { variant: "done", label: "Completed" },
	"on-hold": { variant: "cancelled", label: "On Hold" },
};

const AVATAR_COLORS = [
	"bg-primary",
	"bg-accent",
	"bg-secondary",
	"bg-warning",
	"bg-danger",
];

const EMPTY_FORM = {
	name: "",
	key: "",
	status: "planning" as ProjectStatus,
	description: "",
	iconType: "icon" as ProjectIconType,
	iconValue: DEFAULT_PROJECT_ICON,
	sprint: "",
	sprintEnds: "",
	tagInput: "",
	tags: [] as string[],
	teamIds: [] as string[],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function safePct(completed: number, total: number) {
	return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function projectSprintName(project: Project) {
	return project.sprint?.name || project.sprint_name || "No sprint";
}

type TeamMember = {
	initials: string;
	color: string;
	avatarUrl: string | null;
	name: string;
};

function membersToTeam(members: Project["project_members"]): TeamMember[] {
	return members.map((m) => ({
		initials: getInitials(m.profiles?.full_name ?? null),
		color: avatarColor(String(m.profiles?.full_name)?.length),
		avatarUrl: m.profiles?.avatar_url ?? null,
		name: m.profiles?.full_name ?? "",
	}));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
	return (
		<div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
			<div
				className="h-full bg-primary rounded-full transition-all"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

function TeamAvatars({ team, max = 4 }: { team: TeamMember[]; max?: number }) {
	const visible = team.slice(0, max);
	const extra = team.length - max;
	return (
		<div className="flex items-center">
			{visible.map((m, i) => (
				<Avatar
					key={i}
					className={`h-6 w-6 border-2 border-surface ${i > 0 ? "-ml-2" : ""}`}
				>
					{m.avatarUrl && (
						<AvatarImage src={m.avatarUrl} alt={m.name} />
					)}
					<AvatarFallback
						className={`text-[9px] text-white ${m.color}`}
					>
						{m.initials}
					</AvatarFallback>
				</Avatar>
			))}
			{extra > 0 && (
				<div className="-ml-2 h-6 w-6 rounded-full bg-muted-subtle border-2 border-surface flex items-center justify-center text-[9px] font-medium text-muted">
					+{extra}
				</div>
			)}
		</div>
	);
}

function ProjectCard({
	project,
	onClick,
}: {
	project: Project;
	onClick: () => void;
}) {
	const tasks = project.tasks ?? [];
	const done = tasks.filter((t) => t.status === "done").length;
	const pct = safePct(done, tasks.length);
	const { variant, label } = STATUS_BADGE[project.status];
	const team = membersToTeam(project.project_members ?? []);
	const description = projectDescriptionText(project.description);
	return (
		<Card
			className="p-5 flex flex-col gap-4 hover:shadow-md hover:border-border-strong transition-all cursor-pointer"
			onClick={onClick}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
				<div className="flex min-w-0 flex-1 gap-3">
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-bold text-foreground truncate mb-0">
							{project.name}
						</h3>
						<p className="text-xs text-muted mt-1 line-clamp-2 leading-4">
							{description || "No description."}
						</p>
					</div>
				</div>
				<Badge variant={variant} className="w-fit shrink-0">
					{label}
				</Badge>
			</div>

			<div className="flex gap-1.5 flex-wrap min-h-[20px]">
				{(project.tags ?? []).map((t) => (
					<span
						key={t}
						className="text-[10px] bg-muted-subtle text-muted-foreground px-2 py-0.5 rounded-full font-medium"
					>
						{t}
					</span>
				))}
			</div>

			<div>
				<div className="flex justify-between text-xs mb-1.5">
					<span className="text-muted">Progress</span>
					<span className="font-medium text-foreground">{pct}%</span>
				</div>
				<ProgressBar pct={pct} />
			</div>

			<div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
				<TeamAvatars team={team} />
				<span className="truncate text-right text-[10px] text-muted">
					{projectSprintName(project)}
				</span>
			</div>
		</Card>
	);
}

function ProjectRow({
	project,
	onClick,
}: {
	project: Project;
	onClick: () => void;
}) {
	const tasks = project.tasks ?? [];
	const done = tasks.filter((t) => t.status === "done").length;
	const pct = safePct(done, tasks.length);
	const { variant, label } = STATUS_BADGE[project.status];
	const team = membersToTeam(project.project_members ?? []);
	const description = projectDescriptionText(project.description);
	return (
		<tr
			className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors cursor-pointer"
			onClick={onClick}
		>
			<td className="px-5 py-4">
				<div className="flex items-center gap-2">
					<ProjectIcon
						type={project.icon_type}
						value={project.icon_value}
						className="h-7 w-7 shrink-0"
						iconClassName="h-3.5 w-3.5"
					/>
					<div>
						<p className="text-xs font-medium text-foreground">
							{project.name}
						</p>
						<p className="text-xs text-muted truncate max-w-xs">
							{description
								? description.slice(0, 60) + "..."
								: "No description."}
						</p>
					</div>
				</div>
			</td>
			<td className="px-4 py-4">
				<Badge variant={variant}>{label}</Badge>
			</td>
			<td className="px-4 py-4">
				<div className="flex items-center gap-2 min-w-[120px]">
					<ProgressBar pct={pct} />
					<span className="text-xs text-muted whitespace-nowrap">
						{pct}%
					</span>
				</div>
			</td>
			<td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
				{done} / {tasks.length}
			</td>
			<td className="px-4 py-4">
				<TeamAvatars team={team} max={3} />
			</td>
			<td className="px-4 py-4 text-xs text-muted whitespace-nowrap">
				{projectSprintName(project)}
			</td>
			<td className="px-4 py-4 text-right">
				<ChevronRight className="h-4 w-4 text-muted ml-auto" />
			</td>
		</tr>
	);
}

// ── New Project Dialog ────────────────────────────────────────────────────────

function NewProjectDialog({
	open,
	onClose,
	onCreate,
	profiles,
	profilesLoading,
}: {
	open: boolean;
	onClose: () => void;
	onCreate: (project: Project) => void;
	profiles: Profile[];
	profilesLoading: boolean;
}) {
	const [form, setForm] = useState(EMPTY_FORM);
	const [errors, setErrors] = useState<{
		name?: string;
		icon?: string;
		submit?: string;
	}>({});
	const [submitting, setSubmitting] = useState(false);

	function set<K extends keyof typeof EMPTY_FORM>(
		key: K,
		value: (typeof EMPTY_FORM)[K],
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
		set(
			"teamIds",
			form.teamIds.includes(id)
				? form.teamIds.filter((i) => i !== id)
				: [...form.teamIds, id],
		);
	}

	async function handleSubmit() {
		if (!form.name.trim()) {
			setErrors({ name: "Project name is required." });
			return;
		}
		if (form.iconType === "image" && form.iconValue.length > 1_000_000) {
			setErrors({
				icon: "Icon image is too large. Please upload a smaller image.",
			});
			return;
		}

		setSubmitting(true);
		setErrors({});

		try {
			const project = await createProject({
				name: form.name.trim(),
				key: form.key.trim().toUpperCase() || undefined,
				description: projectDescriptionText(form.description)
					? form.description
					: undefined,
				status: form.status,
				icon_type: form.iconType,
				icon_value: form.iconValue,
				sprint_name: form.sprint.trim() || undefined,
				sprint_end_date: form.sprintEnds || undefined,
				tags: form.tags,
			});

			const currentUserId = project.created_by;
			const membersToAdd = form.teamIds.filter(
				(id) => id !== currentUserId,
			);
			await Promise.all(
				membersToAdd.map((userId) => addMember(project.id, userId)),
			);

			onCreate(project);
			setForm(EMPTY_FORM);
			setErrors({});
			onClose();
			toast.success("Project created", { description: project.name });
		} catch {
			toast.error("Failed to create project", {
				description: "Please try again.",
			});
			setErrors({
				submit: "Failed to create project. Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			setForm(EMPTY_FORM);
			setErrors({});
		}
		if (!open) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[560px] p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle>New Project</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new project.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{/* Name */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
							Project Name <span className="text-danger">*</span>
						</label>
						<Input
							placeholder="e.g. Internal System Rewrite"
							value={form.name}
							onChange={(e) => set("name", e.target.value)}
							className={
								errors.name
									? "border-danger focus:ring-danger"
									: ""
							}
						/>
						{errors.name && (
							<p className="text-xs text-danger mt-1">
								{errors.name}
							</p>
						)}
					</div>

					{/* Project Key */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
							Project Key
						</label>
						<Input
							placeholder="Auto-generated, e.g. WEB"
							value={form.key}
							onChange={(e) =>
								set("key", e.target.value.toUpperCase())
							}
							className="font-mono uppercase"
							maxLength={10}
						/>
						<p className="text-xs text-muted-foreground mt-1">
							2-10 uppercase letters or digits. Used as ticket
							code prefix (e.g. WEB-001).
						</p>
					</div>

					{/* Status + Sprint Name */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<SearchableSelect
								value={form.status}
								onValueChange={(v) =>
									set("status", v as ProjectStatus)
								}
								options={[
									{ value: "planning", label: "Planning" },
									{ value: "in-progress", label: "In Progress" },
									{ value: "on-hold", label: "On Hold" },
									{ value: "completed", label: "Completed" },
								]}
							/>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
								Tags
							</label>
							<div className="flex items-center gap-2">
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
									variant="default"
									size="sm"
									onClick={addTag}
									className="shrink-0 px-2 py-0.5"
								>
									<span className="text-[10px]!">Add</span>
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

					{/* Sprint End Date + Tags */}
					<div className="grid gap-4 sm:grid-cols-2 hidden">
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
								First Sprint Name
							</label>
							<Input
								placeholder="e.g. Sprint 1 Alpha"
								value={form.sprint}
								onChange={(e) => set("sprint", e.target.value)}
							/>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
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
					</div>

					{/* Description */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-1.5 block">
							Description
						</label>
						<ProjectDescriptionEditor
							value={form.description}
							onChange={(value) => set("description", value)}
						/>
					</div>

					{/* Team Members */}
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-2 block">
							Team Members
						</label>
						{profilesLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted py-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading members...
							</div>
						) : (
							<div className="grid gap-2 sm:grid-cols-2">
								{profiles.map((profile) => (
									<label
										key={profile.id}
										className={cn(
											"flex min-w-0 items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
											form.teamIds.includes(profile.id)
												? "border-primary bg-primary-subtle"
												: "border-border hover:bg-muted-subtle",
										)}
									>
										<Checkbox
											checked={form.teamIds.includes(
												profile.id,
											)}
											onCheckedChange={() =>
												toggleMember(profile.id)
											}
										/>
										<Avatar className="h-6 w-6 shrink-0">
											<AvatarFallback
												className={`text-[9px] text-white ${avatarColor(String(profile.full_name)?.length)}`}
											>
												{getInitials(profile.full_name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex min-w-0 flex-col">
											<span className="truncate text-sm text-foreground">
												{profile.full_name ??
													profile.email}
											</span>
											<span className="truncate text-[10px] text-muted-foreground">
												{profile.email}
											</span>
										</div>
									</label>
								))}
							</div>
						)}
					</div>

					{errors.submit && (
						<p className="text-xs text-danger">{errors.submit}</p>
					)}
				</div>

				<DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end">
					<DialogClose asChild>
						<Button
							variant="outline"
							disabled={submitting}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleSubmit}
						disabled={submitting}
						className="w-full sm:w-auto"
					>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Create Project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
	const navigate = useNavigate();
	const { can } = usePermission();
	const canCreateProject = can("Create projects");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [filter, setFilter] = useState<ProjectStatus | "all">("all");
	const [sprintFilter, setSprintFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [view, setView] = useState<"grid" | "list">("grid");

	const projectParams = useMemo(() => {
		const params: {
			status?: string;
			search?: string;
			sprint_id?: string;
		} = {};
		if (filter !== "all") params.status = filter;
		if (sprintFilter !== "all") params.sprint_id = sprintFilter;
		if (search) params.search = search;
		return params;
	}, [filter, sprintFilter, search]);

	const {
		data: projects = [],
		error: projectsError,
		isLoading: projectsLoading,
		mutate: mutateProjects,
	} = useApiSWR<Project[]>(["projects", projectParams], () =>
		listProjects(projectParams),
	);
	const { data: sprints = [], isLoading: sprintsLoading } = useApiSWR<
		Sprint[]
	>(["sprints"], () => listSprints());
	const { data: profiles = [], isLoading: profilesLoading } = useApiSWR<
		Profile[]
	>(["profiles"], () => listProfiles());

	const loading = projectsLoading;
	const error = projectsError
		? projectsError.message || "Failed to load projects."
		: null;

	async function handleCreate(project: Project) {
		await mutateProjects();
		void project;
	}

	const filtered = projects.filter((p) => {
		const matchStatus = filter === "all" || p.status === filter;
		const matchSprint =
			sprintFilter === "all" || p.sprint_id === sprintFilter;
		const matchSearch =
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			projectDescriptionText(p.description)
				.toLowerCase()
				.includes(search.toLowerCase());
		return matchStatus && matchSprint && matchSearch;
	});

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
						Projects
					</h1>
					<p className="text-sm text-muted mt-1">
						{projects.length} projects total
					</p>
				</div>
				{canCreateProject && (
					<Button
						className="hidden items-center gap-2 sm:flex"
						onClick={() => setDialogOpen(true)}
					>
						<Plus className="h-4 w-4" />
						New Project
					</Button>
				)}
			</div>

			{/* Filters + Search + View toggle */}
			<div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
				<div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
					{STATUS_FILTERS.map((f) => (
						<button
							key={f.value}
							onClick={() => setFilter(f.value)}
							className={cn(
								"px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
								filter === f.value
									? "bg-primary text-primary-foreground font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-muted-subtle",
							)}
						>
							{f.label}
						</button>
					))}
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<div className="w-full sm:w-48">
						<SearchableSelect
							value={sprintFilter}
							onValueChange={(v) => setSprintFilter(v || "all")}
							disabled={sprintsLoading}
							loading={sprintsLoading}
							options={[
								{ value: "all", label: "All Sprints" },
								...sprints.map<SearchableSelectOption>((s) => ({
									value: s.id,
									label: s.name,
								})),
							]}
							placeholder={
								sprintsLoading
									? "Loading sprints..."
									: "All Sprints"
							}
						/>
					</div>

					<div className="relative min-w-0 flex-1 sm:flex-none">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
						<Input
							placeholder="Search projects..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-9 w-full pl-8 text-sm sm:w-56"
						/>
					</div>

					<div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-border bg-surface">
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

					{canCreateProject && (
						<Button
							size="icon"
							className="shrink-0 sm:hidden"
							onClick={() => setDialogOpen(true)}
							aria-label="New Project"
						>
							<Plus className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Loading */}
			{loading && (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<div className="rounded-xl aspect-3.5/2 border border-border bg-white p-5">
						<div className="flex w-full">
							<div className="flex flex-col gap-1 w-full">
								<Skeleton className="h-5 w-3/5 mb-2" />
								<Skeleton className="h-3 w-2/4" />
								<Skeleton className="h-3 w-1/4" />
							</div>
							<Skeleton className="w-1/5 h-4" />
						</div>
						<div className="flex flex-col gap-2 w-full mt-20">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-px w-full" />
							<div className="flex items-center gap-1">
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-10 h-4 ml-auto" />
							</div>
						</div>
					</div>
					<div className="rounded-xl aspect-3.5/2 border border-border bg-white p-5">
						<div className="flex w-full">
							<div className="flex flex-col gap-1 w-full">
								<Skeleton className="h-5 w-3/5 mb-2" />
								<Skeleton className="h-3 w-2/4" />
								<Skeleton className="h-3 w-1/4" />
							</div>
							<Skeleton className="w-1/5 h-4" />
						</div>
						<div className="flex flex-col gap-2 w-full mt-20">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-px w-full" />
							<div className="flex items-center gap-1">
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-10 h-4 ml-auto" />
							</div>
						</div>
					</div>
					<div className="rounded-xl aspect-3.5/2 border border-border bg-white p-5">
						<div className="flex w-full">
							<div className="flex flex-col gap-1 w-full">
								<Skeleton className="h-5 w-3/5 mb-2" />
								<Skeleton className="h-3 w-2/4" />
								<Skeleton className="h-3 w-1/4" />
							</div>
							<Skeleton className="w-1/5 h-4" />
						</div>
						<div className="flex flex-col gap-2 w-full mt-20">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-px w-full" />
							<div className="flex items-center gap-1">
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-4 h-4 rounded-full" />
								<Skeleton className="w-10 h-4 ml-auto" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Error */}
			{!loading && error && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-base font-medium text-foreground mb-1">
						Something went wrong
					</p>
					<p className="text-sm text-muted mb-4">{error}</p>
					<Button variant="outline" onClick={() => mutateProjects()}>
						Retry
					</Button>
				</div>
			)}

			{/* Empty state */}
			{!loading && !error && filtered.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<CheckCircle2 className="h-10 w-10 text-border-strong mb-4" />
					<p className="text-base font-medium text-foreground mb-1">
						No projects found
					</p>
					<p className="text-sm text-muted">
						Try adjusting your search or filter.
					</p>
				</div>
			)}

			{/* Grid view */}
			{!loading && !error && view === "grid" && filtered.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{filtered.map((p) => (
						<ProjectCard
							key={p.id}
							project={p}
							onClick={() => navigate(`/projects/${p.id}`)}
						/>
					))}
				</div>
			)}

			{/* List view */}
			{!loading && !error && view === "list" && filtered.length > 0 && (
				<Card className="overflow-hidden p-0">
					<div className="overflow-x-auto">
						<table className="min-w-[760px] w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									{[
										"Project",
										"Status",
										"Progress",
										"Tasks",
										"Team",
										"Sprint",
										"",
									].map((h, i) => (
										<th
											key={h + i}
											className={cn(
												"px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted",
												i === 0
													? "pl-5 text-left"
													: i === 6
														? "text-right"
														: "text-left",
											)}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{filtered.map((p) => (
									<ProjectRow
										key={p.id}
										project={p}
										onClick={() =>
											navigate(`/projects/${p.id}`)
										}
									/>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			)}

			<NewProjectDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				onCreate={handleCreate}
				profiles={profiles}
				profilesLoading={profilesLoading}
			/>
		</div>
	);
}
