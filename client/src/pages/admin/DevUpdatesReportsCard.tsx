import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
	Sparkles,
	FileText,
	Upload,
	Loader2,
	AlertTriangle,
	Copy,
	Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { listSprints, type Sprint } from "@/services/sprint.service";
import {
	listSprintReports,
	generateSprintReport,
	uploadDevUpdateImage,
	type SprintReport,
} from "@/services/dev-updates.service";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function StatBadges({ stats }: { stats: SprintReport["stats"] }) {
	const items = [
		{ label: "updates", value: stats.total },
		{ label: "apps", value: stats.apps },
		{ label: "features", value: stats.features },
		{ label: "fixes", value: stats.fixes },
	].filter((i) => typeof i.value === "number");

	if (items.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-1.5">
			{items.map((i) => (
				<Badge key={i.label} variant="default">
					{i.value} {i.label}
				</Badge>
			))}
		</div>
	);
}

export default function DevUpdatesReportsCard() {
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [reports, setReports] = useState<SprintReport[]>([]);
	const [selectedSprint, setSelectedSprint] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);
	const [active, setActive] = useState<SprintReport | null>(null);

	const fileRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [uploaded, setUploaded] = useState<{
		url: string;
		savings: string;
	} | null>(null);
	const [copied, setCopied] = useState(false);

	async function load() {
		try {
			setLoading(true);
			setError(null);
			const [s, r] = await Promise.all([listSprints(), listSprintReports()]);
			setSprints(s);
			setReports(r);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	async function handleGenerate() {
		if (!selectedSprint) return;
		try {
			setGenerating(true);
			setError(null);
			await generateSprintReport(selectedSprint);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate report");
		} finally {
			setGenerating(false);
		}
	}

	async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploading(true);
			setError(null);
			setUploaded(null);
			const res = await uploadDevUpdateImage(file);
			setUploaded({ url: res.url, savings: res.savings });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	async function copyUrl() {
		if (!uploaded) return;
		await navigator.clipboard.writeText(uploaded.url);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<Card className="p-5">
			<div className="mb-4 flex items-center gap-2">
				<Sparkles className="h-5 w-5 text-primary" />
				<h3 className="text-lg font-semibold text-foreground">
					Dev Updates & Reports
				</h3>
			</div>
			<p className="mb-4 text-sm text-muted">
				Generate an AI summary of a sprint's completed work. Updates are pushed
				to the Dev Updates API and the report is stored here.
			</p>

			{error && (
				<div className="mb-4 flex items-start gap-2 rounded-md border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{/* Generate */}
			<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
				<select
					value={selectedSprint}
					onChange={(e) => setSelectedSprint(e.target.value)}
					className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground"
				>
					<option value="">Select a sprint&hellip;</option>
					{sprints.map((s) => (
						<option key={s.id} value={s.id}>
							{s.name} ({s.status})
						</option>
					))}
				</select>
				<Button
					onClick={handleGenerate}
					disabled={!selectedSprint || generating}
					size="sm"
				>
					{generating ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Sparkles className="h-4 w-4" />
					)}
					{generating ? "Generating&hellip;" : "Generate report"}
				</Button>
			</div>

			{/* Screenshot upload */}
			<div className="mb-5 rounded-md border border-dashed border-border p-3">
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm text-muted">
						Optimize & upload a screenshot
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Upload className="h-4 w-4" />
						)}
						Upload
					</Button>
					<input
						ref={fileRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleUpload}
					/>
				</div>
				{uploaded && (
					<div className="mt-3 flex items-center gap-2 text-xs">
						<Badge variant="default">saved {uploaded.savings}</Badge>
						<code className="flex-1 truncate rounded bg-muted/10 px-2 py-1">
							{uploaded.url}
						</code>
						<button
							type="button"
							onClick={copyUrl}
							className="text-muted hover:text-foreground"
						>
							{copied ? (
								<Check className="h-4 w-4" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</button>
					</div>
				)}
			</div>

			{/* Reports list */}
			{loading ? (
				<p className="text-sm text-muted">Loading reports&hellip;</p>
			) : reports.length === 0 ? (
				<p className="text-sm text-muted">No reports yet.</p>
			) : (
				<ul className="divide-y divide-border">
					{reports.map((r) => (
						<li
							key={r.id}
							className="flex items-center justify-between gap-3 py-3"
						>
							<div className="min-w-0">
								<p className="truncate font-medium text-foreground">
									{r.title}
								</p>
								<p className="text-xs text-muted">
									{MONTHS[r.month - 1]} {r.year}
									{r.created_by ? ` · ${r.created_by.full_name}` : ""}
								</p>
								<div className="mt-1.5">
									<StatBadges stats={r.stats} />
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setActive(r)}
							>
								<FileText className="h-4 w-4" />
								View
							</Button>
						</li>
					))}
				</ul>
			)}

			<Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
				<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{active?.title}</DialogTitle>
					</DialogHeader>
					<div className="prose prose-sm max-w-none dark:prose-invert">
						<ReactMarkdown>{active?.content ?? ""}</ReactMarkdown>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
