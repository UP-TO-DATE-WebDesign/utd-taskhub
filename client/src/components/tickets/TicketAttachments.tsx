import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	type TicketAttachment,
	listTicketAttachments,
	uploadTicketAttachment,
	deleteTicketAttachment,
} from "@/services/ticket-attachment.service";
import { Skeleton } from "../ui/skeleton";
import {
	MAX_BYTES,
	ALLOWED_MIME,
	ACCEPT_ATTR,
	isImage,
	isVideo,
	formatSize,
} from "./attachment-constants";

interface Props {
	projectId: string;
	ticketId: string;
	canEdit: boolean;
}

export function TicketAttachments({ projectId, ticketId, canEdit }: Props) {
	const [items, setItems] = useState<TicketAttachment[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		listTicketAttachments(projectId, ticketId)
			.then((data) => {
				if (active) setItems(data);
			})
			.catch((e: unknown) => {
				if (active) {
					toast.error("Failed to load attachments", {
						description: (e as Error).message,
					});
					setItems([]);
				}
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [projectId, ticketId]);

	function openPicker() {
		inputRef.current?.click();
	}

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		const valid: File[] = [];
		for (const f of Array.from(files)) {
			if (!ALLOWED_MIME.has(f.type)) {
				toast.error("Unsupported file type", { description: f.name });
				continue;
			}
			if (f.size > MAX_BYTES) {
				toast.error("File too large", {
					description: `${f.name} exceeds 50 MB`,
				});
				continue;
			}
			valid.push(f);
		}

		if (valid.length === 0) return;

		setUploading(true);
		try {
			for (const file of valid) {
				try {
					const created = await uploadTicketAttachment(
						projectId,
						ticketId,
						file,
					);
					setItems((prev) => [created, ...prev]);
					toast.success("Attachment uploaded", {
						description: file.name,
					});
				} catch (e) {
					toast.error("Upload failed", {
						description: (e as Error).message || file.name,
					});
				}
			}
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleDelete(att: TicketAttachment) {
		if (!window.confirm(`Delete "${att.file_name}"?`)) return;
		setDeletingId(att.id);
		try {
			await deleteTicketAttachment(projectId, ticketId, att.id);
			setItems((prev) => prev.filter((a) => a.id !== att.id));
			toast.success("Attachment deleted");
		} catch (e) {
			toast.error("Delete failed", {
				description: (e as Error).message,
			});
		} finally {
			setDeletingId(null);
		}
	}

	if (loading) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				<Skeleton className="aspect-4/3" />
				<Skeleton className="aspect-4/3" />
				<Skeleton className="aspect-4/3" />
			</div>
		);
	}

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				multiple
				accept={ACCEPT_ATTR}
				className="hidden"
				onChange={(e) => handleFiles(e.target.files)}
			/>
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{items.map((att) => (
					<AttachmentTile
						key={att.id}
						attachment={att}
						canDelete={canEdit}
						deleting={deletingId === att.id}
						onDelete={() => handleDelete(att)}
					/>
				))}
				{canEdit && (
					<button
						type="button"
						onClick={openPicker}
						disabled={uploading}
						className={cn(
							"aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted hover:border-primary hover:text-primary transition-colors",
							uploading && "opacity-60 cursor-not-allowed",
						)}
					>
						{uploading ? (
							<>
								<Loader2 className="h-5 w-5 mb-1 animate-spin" />
								<span className="text-xs font-medium">
									Uploading...
								</span>
							</>
						) : (
							<>
								<Plus className="h-5 w-5 mb-1" />
								<span className="text-xs font-medium">
									Add New
								</span>
							</>
						)}
					</button>
				)}
			</div>
			{items.length === 0 && !canEdit && (
				<p className="text-[11px] text-muted mt-2 italic">
					No attachments.
				</p>
			)}
		</>
	);
}

function AttachmentTile({
	attachment,
	canDelete,
	deleting,
	onDelete,
}: {
	attachment: TicketAttachment;
	canDelete: boolean;
	deleting: boolean;
	onDelete: () => void;
}) {
	const image = isImage(attachment.mime_type);
	const video = isVideo(attachment.mime_type);

	return (
		<div className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted-subtle/40">
			{video ? (
				<video
					src={attachment.file_url}
					controls
					className="h-full w-full object-cover bg-black"
					title={attachment.file_name}
				/>
			) : (
				<a
					href={attachment.file_url}
					target="_blank"
					rel="noopener noreferrer"
					className="block h-full w-full"
					title={attachment.file_name}
				>
					{image ? (
						<img
							src={attachment.file_url}
							alt={attachment.file_name}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="h-full w-full flex flex-col items-center justify-center p-3 text-center">
							<FileText className="h-7 w-7 text-muted mb-1.5" />
							<span className="text-[11px] font-medium text-foreground truncate w-full">
								{attachment.file_name}
							</span>
							<span className="text-[10px] text-muted mt-0.5">
								{formatSize(attachment.file_size)}
							</span>
						</div>
					)}
				</a>
			)}
			{canDelete && (
				<button
					type="button"
					onClick={onDelete}
					disabled={deleting}
					aria-label={`Delete ${attachment.file_name}`}
					className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition-opacity flex items-center justify-center disabled:opacity-60 z-10"
				>
					{deleting ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<X className="h-3 w-3" />
					)}
				</button>
			)}
		</div>
	);
}
