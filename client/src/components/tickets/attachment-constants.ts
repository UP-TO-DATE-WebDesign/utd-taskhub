export const MAX_BYTES = 50 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/msword",
	"application/vnd.ms-excel",
	"text/plain",
	"application/zip",
	"application/x-zip-compressed",
	"video/mp4",
	"video/webm",
	"video/quicktime",
]);

export const ACCEPT_ATTR =
	".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.doc,.xls,.txt,.zip,.mp4,.webm,.mov";

export function isImage(mime: string): boolean {
	return mime.startsWith("image/");
}

export function isVideo(mime: string): boolean {
	return mime.startsWith("video/");
}

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
