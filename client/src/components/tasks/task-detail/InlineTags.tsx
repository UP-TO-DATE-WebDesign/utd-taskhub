import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reportError } from "./utils";

export function InlineTags({
	value,
	canEdit,
	onSave,
}: {
	value: string[];
	canEdit: boolean;
	onSave: (v: string[]) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [input, setInput] = useState("");
	const [tags, setTags] = useState<string[]>(value);
	const [saving, setSaving] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTags(value);
	}, [value]);

	async function persistTags(next: string[]) {
		setSaving(true);
		try {
			await onSave(next);
		} catch (e) {
			reportError(e);
			setTags(value);
		} finally {
			setSaving(false);
		}
	}

	function addTag() {
		const t = input.trim();
		if (!t || tags.includes(t)) {
			setInput("");
			return;
		}
		const next = [...tags, t];
		setTags(next);
		setInput("");
		persistTags(next);
	}

	function removeTag(t: string) {
		const next = tags.filter((x) => x !== t);
		setTags(next);
		persistTags(next);
	}

	function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
		if (!containerRef.current) return;
		const nextTarget = e.relatedTarget as Node | null;
		if (nextTarget && containerRef.current.contains(nextTarget)) return;
		if (input.trim()) addTag();
		setEditing(false);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"w-full text-left rounded -mx-1 px-1 py-0.5",
					canEdit &&
						"cursor-text hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{tags.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
							>
								{tag}
							</span>
						))}
					</div>
				) : (
					<p className="text-xs text-muted">No tags</p>
				)}
			</button>
		);
	}

	return (
		<div ref={containerRef} onBlur={handleBlur} className="space-y-2">
			<div className="flex items-center gap-1.5">
				<Input
					autoFocus
					placeholder="Add tag..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							addTag();
						} else if (e.key === "Escape") {
							e.preventDefault();
							e.stopPropagation();
							setInput("");
							setEditing(false);
						}
					}}
					className="h-8 text-xs"
				/>
				{saving && (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted shrink-0" />
				)}
			</div>
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{tags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
						>
							{tag}
							<button
								type="button"
								onClick={() => removeTag(tag)}
								className="text-primary/70 hover:text-primary"
							>
								<X className="h-2.5 w-2.5" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
