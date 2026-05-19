export type SerializedDescriptionNode = {
	type?: string;
	text?: string;
	format?: number | string;
	children?: SerializedDescriptionNode[];
	src?: string;
	alt?: string;
};

export const EMPTY_EDITOR_STATE =
	'{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

export function isLexicalState(value: string | null | undefined): boolean {
	if (!value) return false;
	try {
		const parsed = JSON.parse(value);
		return parsed?.root?.type === "root" && Array.isArray(parsed.root.children);
	} catch {
		return false;
	}
}

export function parseLexicalDescription(
	value: string | null | undefined,
): { root: SerializedDescriptionNode } | null {
	if (!value || !isLexicalState(value)) return null;
	try {
		return JSON.parse(value) as { root: SerializedDescriptionNode };
	} catch {
		return null;
	}
}

export function makeInitialEditorState(value: string): string {
	if (isLexicalState(value)) return value;
	if (!value.trim()) return EMPTY_EDITOR_STATE;

	const paragraphs = value.split(/\n{2,}/).map((paragraph) => ({
		children: [
			{
				detail: 0,
				format: 0,
				mode: "normal",
				style: "",
				text: paragraph,
				type: "text",
				version: 1,
			},
		],
		direction: null,
		format: "",
		indent: 0,
		type: "paragraph",
		version: 1,
	}));

	return JSON.stringify({
		root: {
			children: paragraphs,
			direction: null,
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	});
}

function collectText(node: SerializedDescriptionNode): string {
	if (typeof node.text === "string") return node.text;
	if (!Array.isArray(node.children)) return "";
	return node.children.map(collectText).join(node.type === "paragraph" ? " " : "");
}

export function projectDescriptionText(value: string | null | undefined): string {
	if (!value) return "";

	const parsed = parseLexicalDescription(value);
	if (!parsed) return value;

	return parsed.root.children?.map(collectText).join(" ").replace(/\s+/g, " ").trim() ?? "";
}
