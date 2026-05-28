import { useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import PublicPageLayout from "@/pages/PublicPageLayout";

type Status = "loading" | "ready" | "error";

const markdownComponents: Components = {
	h1: () => null,
	h2: ({ children }) => (
		<h2 className="border-b border-border pb-2 text-lg font-semibold text-foreground">
			{children}
		</h2>
	),
	h3: ({ children }) => (
		<h3 className="text-base font-semibold text-foreground">{children}</h3>
	),
	p: ({ children }) => <p className="leading-6">{children}</p>,
	ul: ({ children }) => (
		<ul className="list-disc space-y-1.5 pl-5">{children}</ul>
	),
	ol: ({ children }) => (
		<ol className="list-decimal space-y-1.5 pl-5">{children}</ol>
	),
	li: ({ children }) => <li>{children}</li>,
	a: ({ children, href }) => (
		<a
			href={href}
			className="text-primary underline-offset-2 hover:underline"
		>
			{children}
		</a>
	),
};

export default function WhatsNewPage() {
	const [content, setContent] = useState("");
	const [status, setStatus] = useState<Status>("loading");

	useEffect(() => {
		let active = true;

		fetch("/changelog.md")
			.then((res) => {
				if (!res.ok) throw new Error(`Failed to load changelog: ${res.status}`);
				return res.text();
			})
			.then((text) => {
				if (!active) return;
				setContent(text);
				setStatus("ready");
			})
			.catch(() => {
				if (!active) return;
				setStatus("error");
			});

		return () => {
			active = false;
		};
	}, []);

	return (
		<PublicPageLayout
			eyebrow="What's New"
			title="What's New"
			description="Latest updates and improvements to TaskHub."
		>
			{status === "loading" && (
				<div className="space-y-3">
					<div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
					<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
					<div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
				</div>
			)}

			{status === "error" && (
				<p className="text-sm text-muted-foreground">Could not load updates.</p>
			)}

			{status === "ready" && content.trim() === "" && (
				<p className="text-sm text-muted-foreground">No updates yet.</p>
			)}

			{status === "ready" && content.trim() !== "" && (
				<div className="max-w-3xl space-y-6 text-sm leading-6 text-muted-foreground">
					<ReactMarkdown components={markdownComponents}>
						{content}
					</ReactMarkdown>
				</div>
			)}
		</PublicPageLayout>
	);
}
