import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Undo2,
	Redo2,
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify,
	Code2,
} from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	FORMAT_TEXT_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	UNDO_COMMAND,
	REDO_COMMAND,
	$getSelection,
	$isRangeSelection,
	type EditorState,
} from "lexical";
import {
	$createCodeNode,
	$isCodeNode,
	CodeHighlightNode,
	CodeNode,
} from "@lexical/code-core";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode } from "lexical";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	makeInitialEditorState,
	parseLexicalDescription,
	type SerializedDescriptionNode,
} from "./project-description-utils";
import { ImageNode } from "./ImageNode";
import { ImagePastePlugin } from "./ImagePastePlugin";

const ALIGN_CLASS: Record<string, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
	justify: "text-justify",
	start: "text-start",
	end: "text-end",
};

function alignClass(format: number | string | undefined): string {
	if (typeof format !== "string") return "";
	return ALIGN_CLASS[format] ?? "";
}

function renderText(node: SerializedDescriptionNode, key: string): ReactNode {
	const text = node.text ?? "";
	const format = typeof node.format === "number" ? node.format : 0;
	return (
		<span
			key={key}
			className={cn(
				format & 1 ? "font-semibold" : "",
				format & 2 ? "italic" : "",
				format & 8 ? "underline" : "",
				format & 4 ? "line-through" : "",
				format & 16
					? "rounded bg-muted-subtle px-1 font-mono text-[0.95em]"
					: "",
			)}
		>
			{text}
		</span>
	);
}

function renderNode(node: SerializedDescriptionNode, key: string): ReactNode {
	if (node.type === "linebreak") {
		return <br key={key} />;
	}
	if (node.type === "image" && typeof node.src === "string") {
		return (
			<img
				key={key}
				src={node.src}
				alt={node.alt ?? ""}
				className="max-w-full rounded-md border border-border my-1"
			/>
		);
	}
	if (typeof node.text === "string") return renderText(node, key);
	if (!Array.isArray(node.children)) return null;

	const children = node.children.map((child, index) =>
		renderNode(child, `${key}-${index}`),
	);
	if (node.type === "paragraph") {
		const isEmpty = node.children.length === 0;
		return (
			<p
				key={key}
				className={cn(
					"mb-2 last:mb-0 whitespace-pre-wrap break-words",
					alignClass(node.format),
				)}
			>
				{isEmpty ? <br /> : children}
			</p>
		);
	}
	if (node.type === "code") {
		return (
			<pre
				key={key}
				className={cn(
					"block rounded-md bg-slate-900 text-slate-100 px-3 py-2 my-2 font-mono text-xs whitespace-pre-wrap break-words overflow-x-auto",
					alignClass(node.format),
				)}
			>
				<code>{children}</code>
			</pre>
		);
	}
	if (node.type === "code-highlight") {
		return <span key={key}>{children}</span>;
	}

	return <span key={key}>{children}</span>;
}

export function ProjectDescriptionPreview({
	value,
	className,
	fallback = "No description.",
}: {
	value: string | null | undefined;
	className?: string;
	fallback?: string;
}) {
	if (!value) return <span className={className}>{fallback}</span>;
	const parsed = parseLexicalDescription(value);
	if (!parsed) {
		return (
			<div className={cn("whitespace-pre-wrap break-words", className)}>
				{value}
			</div>
		);
	}

	const children = parsed.root.children?.map((child, index) =>
		renderNode(child, String(index)),
	);
	return <div className={className}>{children}</div>;
}

function ToolbarButton({
	label,
	active,
	onClick,
	children,
}: {
	label: string;
	active?: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Button
			type="button"
			variant={active ? "default" : "outline"}
			size="icon"
			onClick={onClick}
			aria-label={label}
			className="h-8 w-8 !rounded-xs"
		>
			{children}
		</Button>
	);
}

function ToolbarSeparator() {
	return <div className="mx-1 h-5 w-px bg-border" />;
}

function AutoFocusPlugin() {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		editor.focus();
	}, [editor]);
	return null;
}

function DescriptionToolbar({ floating = false }: { floating?: boolean }) {
	const [editor] = useLexicalComposerContext();

	function toggleCodeBlock() {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;
			const anchorNode = selection.anchor.getNode();
			const block =
				anchorNode.getKey() === "root"
					? anchorNode
					: anchorNode.getTopLevelElementOrThrow();
			if ($isCodeNode(block)) {
				$setBlocksType(selection, () => $createParagraphNode());
			} else {
				$setBlocksType(selection, () => $createCodeNode());
			}
		});
	}

	return (
		<div
			className={cn(
				"flex items-center gap-1",
				floating
					? "absolute -top-12 left-0 z-10 rounded-md border border-border bg-surface px-1 py-1 shadow-md opacity-0 pointer-events-none transition-opacity group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
					: "border-b border-border bg-muted-subtle/40 px-2 py-2",
			)}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
		>
			<ToolbarButton
				label="Undo"
				onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
			>
				<Undo2 className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Redo"
				onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
			>
				<Redo2 className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarSeparator />
			<ToolbarButton
				label="Bold"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
				}
			>
				<Bold className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Italic"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
				}
			>
				<Italic className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Underline"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
				}
			>
				<Underline className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Strikethrough"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
				}
			>
				<Strikethrough className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton label="Code block" onClick={toggleCodeBlock}>
				<Code2 className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarSeparator />
			<ToolbarButton
				label="Align Left"
				onClick={() =>
					editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")
				}
			>
				<AlignLeft className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Align Center"
				onClick={() =>
					editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")
				}
			>
				<AlignCenter className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Align Right"
				onClick={() =>
					editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")
				}
			>
				<AlignRight className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				label="Align Justify"
				onClick={() =>
					editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")
				}
			>
				<AlignJustify className="h-3.5 w-3.5" />
			</ToolbarButton>
		</div>
	);
}

export function ProjectDescriptionEditor({
	value,
	onChange,
	placeholder = "Describe the project goals and scope...",
	inline = false,
	autoFocus = false,
	onBlur,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	inline?: boolean;
	autoFocus?: boolean;
	onBlur?: () => void;
}) {
	const [initialConfig] = useState(() => ({
		namespace: "ProjectDescription",
		editorState: makeInitialEditorState(value),
		nodes: [CodeNode, CodeHighlightNode, ImageNode],
		onError(error: Error) {
			throw error;
		},
		theme: {
			text: {
				bold: "font-semibold",
				italic: "italic",
				underline: "underline",
				strikethrough: "line-through",
				code: "rounded bg-muted-subtle px-1 font-mono text-[0.95em]",
			},
			code: "block rounded-md bg-slate-900 text-slate-100 px-3 py-2 my-2 font-mono text-xs whitespace-pre overflow-x-auto",
		},
	}));

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<div
				className={cn(
					inline
						? "group relative"
						: "overflow-hidden rounded-lg border border-border-strong bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary",
				)}
				onBlur={
					onBlur
						? (e) => {
								if (
									!e.currentTarget.contains(
										e.relatedTarget as Node | null,
									)
								) {
									onBlur();
								}
							}
						: undefined
				}
			>
				<DescriptionToolbar floating={inline} />
				<div className="relative">
					<RichTextPlugin
						contentEditable={
							<ContentEditable
								aria-placeholder={placeholder}
								placeholder={
									<div
										className={cn(
											"pointer-events-none absolute text-sm text-muted",
											inline
												? "left-1 top-0.5"
												: "left-3 top-3",
										)}
									>
										{placeholder}
									</div>
								}
								className={cn(
									"w-full resize-none text-sm leading-relaxed text-foreground outline-none",
									inline
										? "-mx-1 min-h-[1.5rem] rounded px-1 py-0.5"
										: "min-h-50 px-3 py-2",
								)}
							/>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				</div>
				<HistoryPlugin />
				<ImagePastePlugin />
				{autoFocus && <AutoFocusPlugin />}
				<OnChangePlugin
					onChange={(editorState: EditorState) => {
						onChange(JSON.stringify(editorState.toJSON()));
					}}
				/>
			</div>
		</LexicalComposer>
	);
}
