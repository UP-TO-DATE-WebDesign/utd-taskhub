import { api } from "@/lib/api";
import type { Theme } from "@/types/user";

export interface Profile {
	id: string;
	full_name: string | null;
	email: string;
	avatar_url: string | null;
	role: string;
	status: string;
	theme?: Theme;
	created_at?: string;
}

export interface UpdateProfilePayload {
	full_name?: string | null;
	avatar_url?: string | null;
	theme?: Theme;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Failed to read avatar image."));
			}
		};
		reader.onerror = () => reject(new Error("Failed to read avatar image."));
		reader.readAsDataURL(file);
	});
}

export async function listProfiles(): Promise<Profile[]> {
	const res = await api.get<{ success: boolean; data: Profile[] }>("/profiles");
	return res.data;
}

export async function getProfile(id: string): Promise<Profile> {
	const res = await api.get<{ success: boolean; data: { profile: Profile } }>(`/profiles/${id}`);
	return res.data.profile;
}

export async function updateProfile(id: string, payload: UpdateProfilePayload): Promise<Profile> {
	const res = await api.patch<{ success: boolean; data: { profile: Profile } }>(`/profiles/${id}`, payload);
	return res.data.profile;
}

export async function uploadProfileAvatar(id: string, file: File): Promise<Profile> {
	const dataUrl = await readFileAsDataUrl(file);
	const res = await api.post<{ success: boolean; data: { profile: Profile } }>(`/profiles/${id}/avatar`, {
		data: dataUrl,
		content_type: file.type,
		file_name: file.name,
	});
	return res.data.profile;
}
