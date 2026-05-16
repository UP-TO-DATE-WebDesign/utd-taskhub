import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	getUnreadCount,
	listNotifications,
	markAllRead as markAllReadApi,
	markRead as markReadApi,
	requestStreamTicket,
	type Notification,
} from "@/services/notification.service";
import { useAuth } from "@/context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050/api/v1";
const BACKOFF_MAX_MS = 30_000;

export interface UseNotificationStreamResult {
	notifications: Notification[];
	unreadCount: number;
	markRead: (id: string) => Promise<void>;
	markAllRead: () => Promise<void>;
}

export function useNotificationStream(): UseNotificationStreamResult {
	const { isAuthenticated, user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);

	const sourceRef = useRef<EventSource | null>(null);
	const backoffRef = useRef(1000);
	const reconnectTimerRef = useRef<number | null>(null);

	const seed = useCallback(async () => {
		try {
			const [list, count] = await Promise.all([
				listNotifications({ limit: 50 }),
				getUnreadCount(),
			]);
			setNotifications(list);
			setUnreadCount(count);
		} catch (err) {
			console.error("[notif] seed failed:", err);
		}
	}, []);

	const closeStream = useCallback(() => {
		if (reconnectTimerRef.current) {
			window.clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
		sourceRef.current?.close();
		sourceRef.current = null;
	}, []);

	const openStream = useCallback(async () => {
		closeStream();

		let ticket: string;
		try {
			ticket = await requestStreamTicket();
		} catch (err) {
			console.error("[notif] ticket request failed:", err);
			const delay = backoffRef.current;
			backoffRef.current = Math.min(delay * 2, BACKOFF_MAX_MS);
			reconnectTimerRef.current = window.setTimeout(() => {
				openStream();
			}, delay);
			return;
		}

		const url = `${API_URL}/notifications/stream?ticket=${encodeURIComponent(ticket)}`;
		const es = new EventSource(url);
		sourceRef.current = es;

		es.addEventListener("ready", () => {
			backoffRef.current = 1000;
		});

		es.onmessage = (event) => {
			try {
				const row = JSON.parse(event.data) as Notification;
				if (!row?.id) return;
				setNotifications((prev) => {
					if (prev.some((n) => n.id === row.id)) return prev;
					return [row, ...prev].slice(0, 100);
				});
				if (!row.read) setUnreadCount((c) => c + 1);
				toast.info(row.title, {
					description: row.body ?? undefined,
				});
			} catch (e) {
				console.error("[notif] parse failed:", e);
			}
		};

		es.onerror = () => {
			es.close();
			sourceRef.current = null;
			const delay = backoffRef.current;
			backoffRef.current = Math.min(delay * 2, BACKOFF_MAX_MS);
			reconnectTimerRef.current = window.setTimeout(() => {
				openStream();
			}, delay);
		};
	}, [closeStream]);

	useEffect(() => {
		if (!isAuthenticated || !user) {
			closeStream();
			setNotifications([]);
			setUnreadCount(0);
			return;
		}

		seed();
		openStream();

		return () => {
			closeStream();
		};
	}, [isAuthenticated, user?.id, seed, openStream, closeStream]);

	const markRead = useCallback(async (id: string) => {
		setNotifications((prev) =>
			prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)),
		);
		setUnreadCount((c) => {
			const target = notifications.find((n) => n.id === id);
			if (target && !target.read) return Math.max(0, c - 1);
			return c;
		});
		try {
			await markReadApi(id);
		} catch (err) {
			console.error("[notif] markRead failed:", err);
		}
	}, [notifications]);

	const markAllRead = useCallback(async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		setUnreadCount(0);
		try {
			await markAllReadApi();
		} catch (err) {
			console.error("[notif] markAllRead failed:", err);
		}
	}, []);

	return { notifications, unreadCount, markRead, markAllRead };
}
