// Extract human-readable plain text from a Lexical editor state string.
// Mirrors client/src/components/projects/project-description-utils.ts so the
// server can serialize task/ticket descriptions for outbound payloads.

function isLexicalState(value) {
	if (!value) return false;
	try {
		const parsed = JSON.parse(value);
		return parsed?.root?.type === "root" && Array.isArray(parsed.root.children);
	} catch {
		return false;
	}
}

function collectText(node) {
	if (typeof node.text === "string") return node.text;
	if (!Array.isArray(node.children)) return "";
	return node.children
		.map(collectText)
		.join(node.type === "paragraph" ? " " : "");
}

export function lexicalToPlainText(value) {
	if (!value || typeof value !== "string") return "";
	if (!isLexicalState(value)) return value.trim();

	try {
		const parsed = JSON.parse(value);
		return (parsed.root.children ?? [])
			.map(collectText)
			.join("\n")
			.replace(/[ \t]+/g, " ")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	} catch {
		return value.trim();
	}
}
