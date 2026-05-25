import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	updateProfile,
	uploadProfileAvatar,
	type Profile,
	type UpdateProfilePayload,
} from "@/services/profile.service";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function ProfilePersonalSection({
	profile,
	onProfileChange,
}: {
	profile: Profile;
	onProfileChange: (p: Profile) => void;
}) {
	const [saving, setSaving] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
	const [avatarMarkedForRemoval, setAvatarMarkedForRemoval] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [form, setForm] = useState<UpdateProfilePayload>({
		full_name: profile.full_name ?? "",
		avatar_url: profile.avatar_url ?? "",
	});

	useEffect(() => {
		return () => {
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		};
	}, [avatarPreviewUrl]);

	function handleAvatarChange(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Choose an image file for your avatar.");
			return;
		}
		if (file.size > AVATAR_MAX_BYTES) {
			toast.error("Avatar image must be 2 MB or smaller.");
			return;
		}
		if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		setAvatarFile(file);
		setAvatarPreviewUrl(URL.createObjectURL(file));
		setAvatarMarkedForRemoval(false);
		setForm((f) => ({ ...f, avatar_url: profile.avatar_url ?? "" }));
	}

	function handleRemoveAvatar() {
		if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		setAvatarFile(null);
		setAvatarPreviewUrl(null);
		setAvatarMarkedForRemoval(true);
		setForm((f) => ({ ...f, avatar_url: "" }));
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		try {
			const payload: UpdateProfilePayload = {};
			const trimmedName = form.full_name?.trim();
			const trimmedAvatar = form.avatar_url?.trim();
			if (trimmedName !== (profile.full_name ?? ""))
				payload.full_name = trimmedName || null;
			if (
				!avatarFile &&
				(avatarMarkedForRemoval ||
					trimmedAvatar !== (profile.avatar_url ?? ""))
			)
				payload.avatar_url = trimmedAvatar || null;

			if (Object.keys(payload).length === 0 && !avatarFile) {
				toast.info("No changes to save.");
				return;
			}

			let updated = profile;
			if (Object.keys(payload).length > 0) {
				updated = await updateProfile(profile.id, payload);
			}
			if (avatarFile) {
				updated = await uploadProfileAvatar(profile.id, avatarFile);
			}
			onProfileChange(updated);
			setForm({
				full_name: updated.full_name ?? "",
				avatar_url: updated.avatar_url ?? "",
			});
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
			setAvatarFile(null);
			setAvatarPreviewUrl(null);
			setAvatarMarkedForRemoval(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
			toast.success("Profile updated.");
		} catch {
			toast.error("Failed to update profile.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card className="p-6">
			<h2 className="text-sm font-semibold text-foreground">
				Personal Information
			</h2>
			<Separator className="my-4" />

			<form onSubmit={handleSave} className="space-y-4">
				<div className="space-y-1.5">
					<label
						htmlFor="full_name"
						className="text-xs font-medium text-muted-foreground"
					>
						Full Name
					</label>
					<Input
						id="full_name"
						placeholder="Your full name"
						value={form.full_name ?? ""}
						onChange={(e) =>
							setForm((f) => ({ ...f, full_name: e.target.value }))
						}
					/>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="avatar_upload"
						className="text-xs font-medium text-muted-foreground"
					>
						Avatar
					</label>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						{avatarFile ? (
							<span className="truncate font-bold text-sm text-primary py-3">
								{avatarFile.name}
							</span>
						) : (
							<label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-subtle">
								<Upload className="h-4 w-4" />
								Choose image
								<input
									ref={fileInputRef}
									id="avatar_upload"
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									className="sr-only"
									onChange={(e) =>
										handleAvatarChange(e.target.files?.[0])
									}
								/>
							</label>
						)}
						{(avatarFile ||
							(!avatarMarkedForRemoval && profile.avatar_url)) && (
							<Button
								type="button"
								variant="destructive"
								size="xs"
								onClick={handleRemoveAvatar}
							>
								<X className="-mr-1 h-3 w-3" />
								<small className="text-[9px]">Remove</small>
							</Button>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						Upload a JPG, PNG, WebP, or GIF image up to 2 MB.
					</p>
				</div>

				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground">
						Email
					</label>
					<Input
						value={profile.email}
						disabled
						className="opacity-60"
					/>
					<p className="text-xs text-muted-foreground">
						Email cannot be changed here.
					</p>
				</div>

				<div className="pt-2">
					<Button type="submit" disabled={saving} size="sm">
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</form>
		</Card>
	);
}
