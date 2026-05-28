import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	type ProjectMember,
	listMembers,
} from "@/services/project-member.service";
import { getInitials, profileColorClass } from "./types";

interface Props {
	projectId: string;
	value: string;
	submitting: boolean;
	placeholder?: string;
	submitLabel?: string;
	autoFocus?: boolean;
	onChange: (value: string, mentionedIds: string[]) => void;
	onSubmit: () => void;
	onCancel?: () => void;
}

interface MentionState {
	active: boolean;
	query: string;
	tokenStart: number;
	cursor: number;
}

const INACTIVE: MentionState = {
	active: false,
	query: "",
	tokenStart: -1,
	cursor: -1,
};

interface CaretCoords {
	top: number;
	left: number;
}

const MIRROR_COPY_PROPS = [
	"boxSizing",
	"width",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"fontStyle",
	"fontVariant",
	"fontWeight",
	"fontStretch",
	"fontSize",
	"fontFamily",
	"lineHeight",
	"letterSpacing",
	"textTransform",
	"wordSpacing",
	"whiteSpace",
	"wordWrap",
	"overflowWrap",
	"tabSize",
] as const;

function getCaretCoordinates(
	textarea: HTMLTextAreaElement,
	position: number,
): CaretCoords {
	const style = window.getComputedStyle(textarea);
	const mirror = document.createElement("div");
	for (const prop of MIRROR_COPY_PROPS) {
		// @ts-expect-error indexing CSSStyleDeclaration by known string keys
		mirror.style[prop] = style[prop];
	}
	mirror.style.position = "absolute";
	mirror.style.visibility = "hidden";
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.wordWrap = "break-word";
	mirror.style.overflow = "hidden";
	mirror.style.top = "0";
	mirror.style.left = "-9999px";

	mirror.textContent = textarea.value.slice(0, position);
	const marker = document.createElement("span");
	marker.textContent = textarea.value.slice(position) || ".";
	mirror.appendChild(marker);

	document.body.appendChild(mirror);
	const lineHeight = parseFloat(style.lineHeight) || 18;
	const top = marker.offsetTop - textarea.scrollTop + lineHeight;
	const left = marker.offsetLeft - textarea.scrollLeft;
	document.body.removeChild(mirror);

	return { top, left };
}

function detectMention(text: string, caret: number): MentionState {
	if (caret <= 0) return INACTIVE;
	let i = caret - 1;
	while (i >= 0) {
		const ch = text[i];
		if (ch === "@") {
			if (i > 0 && /\S/.test(text[i - 1])) return INACTIVE;
			const query = text.slice(i + 1, caret);
			if (/\s/.test(query)) return INACTIVE;
			return { active: true, query, tokenStart: i, cursor: caret };
		}
		if (/\s/.test(ch)) return INACTIVE;
		i -= 1;
	}
	return INACTIVE;
}

export function CommentComposer({
	projectId,
	value,
	submitting,
	placeholder = "Add a comment...",
	submitLabel = "Comment",
	autoFocus = false,
	onChange,
	onSubmit,
	onCancel,
}: Props) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [members, setMembers] = useState<ProjectMember[]>([]);
	const [mention, setMention] = useState<MentionState>(INACTIVE);
	const [caretCoords, setCaretCoords] = useState<CaretCoords | null>(null);
	const [highlight, setHighlight] = useState(0);
	const mentionedIdsRef = useRef<Set<string>>(new Set());

	function updateMention(text: string, caret: number) {
		const m = detectMention(text, caret);
		setMention(m);
		if (m.active && textareaRef.current) {
			setCaretCoords(getCaretCoordinates(textareaRef.current, m.tokenStart));
		} else {
			setCaretCoords(null);
		}
	}

	useEffect(() => {
		let active = true;
		listMembers(projectId)
			.then((data) => {
				if (active) setMembers(data);
			})
			.catch(() => {
				if (active) setMembers([]);
			});
		return () => {
			active = false;
		};
	}, [projectId]);

	const filtered = useMemo(() => {
		if (!mention.active) return [];
		const q = mention.query.toLowerCase();
		return members
			.filter((m) => {
				const name = (m.profiles.full_name ?? "").toLowerCase();
				const email = m.profiles.email.toLowerCase();
				return q === "" || name.includes(q) || email.includes(q);
			})
			.slice(0, 6);
	}, [members, mention]);

	useEffect(() => {
		setHighlight(0);
	}, [mention.query, mention.active]);

	const emitMentions = useCallback(
		(nextValue: string) => {
			const stillReferenced = new Set<string>();
			for (const id of mentionedIdsRef.current) {
				const member = members.find((m) => m.user_id === id);
				const name = member?.profiles.full_name?.trim();
				if (!name) continue;
				if (nextValue.includes(`@${name}`)) stillReferenced.add(id);
			}
			mentionedIdsRef.current = stillReferenced;
			return Array.from(stillReferenced);
		},
		[members],
	);

	function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const next = e.target.value;
		const caret = e.target.selectionStart ?? next.length;
		updateMention(next, caret);
		const ids = emitMentions(next);
		onChange(next, ids);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (mention.active && filtered.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlight((h) => (h + 1) % filtered.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlight(
					(h) => (h - 1 + filtered.length) % filtered.length,
				);
				return;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				selectMember(filtered[highlight]);
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setMention(INACTIVE);
				setCaretCoords(null);
				return;
			}
		}
		if (e.key === "Escape" && onCancel) {
			e.preventDefault();
			onCancel();
		}
	}

	function selectMember(member: ProjectMember) {
		const name = member.profiles.full_name?.trim() || member.profiles.email;
		const before = value.slice(0, mention.tokenStart);
		const after = value.slice(mention.cursor);
		const insertion = `@${name} `;
		const next = before + insertion + after;
		mentionedIdsRef.current.add(member.user_id);
		const ids = emitMentions(next);
		onChange(next, ids);
		setMention(INACTIVE);
		setCaretCoords(null);
		queueMicrotask(() => {
			const el = textareaRef.current;
			if (!el) return;
			const pos = before.length + insertion.length;
			el.focus();
			el.setSelectionRange(pos, pos);
		});
	}

	const showDropdown = mention.active && filtered.length > 0;

	return (
		<div className="relative flex flex-col gap-2">
			<textarea
				ref={textareaRef}
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onSelect={(e) => {
					const caret =
						e.currentTarget.selectionStart ?? value.length;
					updateMention(value, caret);
				}}
				autoFocus={autoFocus}
				placeholder={placeholder}
				rows={2}
				className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
			/>
			{showDropdown && (
				<div
						className="absolute z-30 w-72 max-w-full rounded-md border border-border bg-surface shadow-md overflow-hidden"
						style={{
							top: caretCoords?.top ?? "100%",
							left: caretCoords ? Math.max(0, caretCoords.left) : 0,
						}}
					>
					<ul className="max-h-56 overflow-y-auto py-1">
						{filtered.map((m, idx) => {
							const name =
								m.profiles.full_name || m.profiles.email;
							const initials = getInitials(name);
							const color = profileColorClass(m.user_id);
							return (
								<li key={m.user_id}>
									<button
										type="button"
										onMouseDown={(e) => {
											e.preventDefault();
											selectMember(m);
										}}
										onMouseEnter={() => setHighlight(idx)}
										className={cn(
											"flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm",
											idx === highlight
												? "bg-primary/10"
												: "hover:bg-muted-subtle",
										)}
									>
										<Avatar className="h-6 w-6 shrink-0">
											{m.profiles.avatar_url ? (
												<AvatarImage
													src={m.profiles.avatar_url}
												/>
											) : null}
											<AvatarFallback
												className={cn(
													"text-[10px] text-white",
													color,
												)}
											>
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="truncate text-foreground">
												{name}
											</div>
											{m.profiles.full_name && (
												<div className="truncate text-[11px] text-muted">
													{m.profiles.email}
												</div>
											)}
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			)}
			<div className="flex justify-end gap-2">
				{onCancel && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onCancel}
						disabled={submitting}
					>
						Cancel
					</Button>
				)}
				<Button
						size="sm"
						onClick={onSubmit}
						disabled={submitting || !value.trim()}
					>
						{submitting && (
							<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
						)}
						{submitLabel}
					</Button>
			</div>
		</div>
	);
}
