import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SectionBlock } from "./SectionBlock";
import {
	getWorkspaceSettings,
	updateWorkspaceSettings,
	type UpdateWorkspaceSettingsPayload,
	type WorkspaceSettings,
} from "@/services/workspace-settings.service";

const TIMEZONE_OPTIONS = [
	{ value: "pacific", label: "(GMT-08:00) Pacific Time" },
	{ value: "mountain", label: "(GMT-07:00) Mountain Time" },
	{ value: "central", label: "(GMT-06:00) Central Time" },
	{ value: "eastern", label: "(GMT-05:00) Eastern Time" },
	{ value: "utc", label: "(GMT+00:00) UTC" },
];

const LANGUAGE_OPTIONS = [
	{ value: "en-us", label: "English (US)" },
	{ value: "en-gb", label: "English (UK)" },
	{ value: "fr", label: "French" },
	{ value: "de", label: "German" },
	{ value: "es", label: "Spanish" },
];

const EMPTY_FORM: Required<UpdateWorkspaceSettingsPayload> = {
	workspace_name: "",
	workspace_timezone: "utc",
	workspace_language: "en-us",
};

export function GeneralSection() {
	const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
	const [form, setForm] =
		useState<Required<UpdateWorkspaceSettingsPayload>>(EMPTY_FORM);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		getWorkspaceSettings()
			.then((s) => {
				if (cancelled) return;
				setSettings(s);
				setForm({
					workspace_name: s.workspace_name,
					workspace_timezone: s.workspace_timezone,
					workspace_language: s.workspace_language,
				});
			})
			.catch((err: Error) => {
				if (!cancelled)
					toast.error(
						err.message || "Failed to load workspace settings.",
					);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	function buildDiff(): UpdateWorkspaceSettingsPayload {
		if (!settings) return {};
		const diff: UpdateWorkspaceSettingsPayload = {};
		const trimmedName = form.workspace_name.trim();
		if (trimmedName !== settings.workspace_name)
			diff.workspace_name = trimmedName;
		if (form.workspace_timezone !== settings.workspace_timezone)
			diff.workspace_timezone = form.workspace_timezone;
		if (form.workspace_language !== settings.workspace_language)
			diff.workspace_language = form.workspace_language;
		return diff;
	}

	async function handleSave() {
		if (!settings) return;
		const diff = buildDiff();
		if (Object.keys(diff).length === 0) {
			toast.message("No changes to save.");
			return;
		}
		if (
			diff.workspace_name !== undefined &&
			diff.workspace_name.length === 0
		) {
			toast.error("Workspace name is required.");
			return;
		}
		setSaving(true);
		try {
			const updated = await updateWorkspaceSettings(diff);
			setSettings(updated);
			setForm({
				workspace_name: updated.workspace_name,
				workspace_timezone: updated.workspace_timezone,
				workspace_language: updated.workspace_language,
			});
			toast.success("Workspace settings saved.");
		} catch (err) {
			toast.error(
				(err as Error).message || "Failed to save workspace settings.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<SectionBlock
			title="General Settings"
			description="Update your basic workspace information."
		>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
						Workspace Name
					</label>
					<Input
						value={form.workspace_name}
						onChange={(e) =>
							setForm((f) => ({
								...f,
								workspace_name: e.target.value,
							}))
						}
						disabled={loading || saving}
					/>
				</div>
				{/* <div>
					<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
						Workspace URL
					</label>
					<div className="flex items-center gap-0">
						<span className="h-9 flex items-center px-3 text-sm text-muted border border-r-0 border-border-strong bg-muted-subtle rounded-l-lg whitespace-nowrap">
							taskhub.io/
						</span>
						<Input defaultValue="hq" className="rounded-l-none" />
					</div>
				</div> */}
				<div>
					<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
						Time Zone
					</label>
					<SearchableSelect
						value={form.workspace_timezone}
						onValueChange={(value) =>
							setForm((f) => ({
								...f,
								workspace_timezone: value,
							}))
						}
						disabled={loading || saving}
						options={TIMEZONE_OPTIONS}
					/>
				</div>
				<div>
					<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
						Language
					</label>
					<SearchableSelect
						value={form.workspace_language}
						onValueChange={(value) =>
							setForm((f) => ({
								...f,
								workspace_language: value,
							}))
						}
						disabled={loading || saving}
						options={LANGUAGE_OPTIONS}
					/>
				</div>
			</div>
			<div className="mt-5 flex justify-end">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={loading || saving}
				>
					{saving ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</SectionBlock>
	);
}
