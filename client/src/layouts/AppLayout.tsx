import { useEffect, useState } from "react";
import {
	Link,
	NavLink,
	Outlet,
	useLocation,
	useNavigate,
} from "react-router-dom";
import {
	Bell,
	User,
	LogOut,
	Menu,
	ChevronDown,
	LayoutDashboard,
	FolderKanban,
	ListChecks,
	Ticket,
	Zap,
	Users,
	BarChart3,
	Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import type { Notification } from "@/services/notification.service";
import SprintCapacity from "@/components/users/SprintCapacity";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type NavLinkItem = {
	to: string;
	label: string;
	icon: LucideIcon;
	end?: boolean;
	feature: string | null;
	iconOnly?: boolean;
};

const navLinks: NavLinkItem[] = [
	{
		to: "/",
		label: "Dashboard",
		icon: LayoutDashboard,
		end: true,
		feature: null,
	},
	{ to: "/projects", label: "Projects", icon: FolderKanban, feature: null },
	{ to: "/tasks", label: "Tasks", icon: ListChecks, feature: null },
	{ to: "/tickets", label: "Tickets", icon: Ticket, feature: null },
	{ to: "/sprints", label: "Sprints", icon: Zap, feature: "View sprints" },
	{ to: "/users", label: "Users", icon: Users, feature: "View users" },
	{
		to: "/admin/reports",
		label: "Reports",
		icon: BarChart3,
		feature: "Workspace settings",
	},
	{
		to: "/settings",
		label: "Settings",
		icon: Settings,
		feature: "Workspace settings",
		iconOnly: true,
	},
];

function formatRelativeTime(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const sec = Math.max(1, Math.floor(diffMs / 1000));
	if (sec < 60) return `${sec}s ago`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 7) return `${day}d ago`;
	return new Date(iso).toLocaleDateString();
}

function routeForNotification(n: Notification): string | null {
	const d = n.data ?? {};
	if (d.task_id && d.project_id)
		return `/projects/${d.project_id}?task=${d.task_id}`;
	if (d.ticket_id && d.project_id)
		return `/projects/${d.project_id}?ticket=${d.ticket_id}`;
	if (d.project_id) return `/projects/${d.project_id}`;
	if (d.sprint_id) return `/sprints`;
	if (n.type === "user.signed_up") return "/users";
	if (n.type === "role.changed") return "/profile";
	return null;
}

export default function AppLayout() {
	const { user, logout } = useAuth();
	const { can } = usePermission();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	useEffect(() => {
		setMobileNavOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		if (!mobileNavOpen) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setMobileNavOpen(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [mobileNavOpen]);
	const { notifications, unreadCount, markRead, markAllRead } =
		useNotificationStream();

	const visibleNavLinks = navLinks.filter(
		(l) => !l.feature || can(l.feature),
	);
	const [notificationsDialogOpen, setNotificationsDialogOpen] =
		useState(false);

	const initials = user?.full_name
		? user.full_name
				.split(" ")
				.map((p) => p[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "AR";

	const displayName = user?.full_name ?? user?.email?.split("@")[0];
	const role = user?.role ?? "Admin";

	async function handleLogout() {
		await logout();
		navigate("/login");
	}

	async function handleNotificationClick(n: Notification) {
		if (!n.read) {
			await markRead(n.id);
		}
		const route = routeForNotification(n);
		if (route) navigate(route);
	}

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-sm">
				<div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-4 sm:px-5 lg:gap-6 lg:px-6">
					<button
						className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-subtle hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
						aria-label="Open navigation menu"
						aria-controls="mobile-header-menu"
						aria-expanded={mobileNavOpen}
						onClick={() => setMobileNavOpen((open) => !open)}
					>
						<Menu className="h-5 w-5" />
					</button>

					<Link
						to="/"
						aria-label="TaskHub home"
						className="mr-2 flex min-w-0 shrink-0 items-center gap-2 lg:mr-4"
					>
						<img
							src="/logo.svg"
							alt="TaskHub"
							className="h-7 w-auto max-w-[110px] sm:h-8 sm:max-w-[132px]"
						/>
					</Link>

					<nav className="hidden items-center gap-1 lg:flex">
						{visibleNavLinks.map((link) => {
							const Icon = link.icon;
							return (
								<NavLink
									key={link.to}
									to={link.to}
									end={link.end}
									title={
										link.iconOnly ? link.label : undefined
									}
									aria-label={
										link.iconOnly ? link.label : undefined
									}
									className={({ isActive }) =>
										cn(
											"flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md group hover:scale-105 duration-300 transition-all",
											isActive
												? "text-primary font-medium border-b-2 border-primary rounded-none"
												: "text-muted-foreground hover:text-foreground hover:bg-muted-subtle",
										)
									}
								>
									<Icon className="h-4 w-4 shrink-0 group-hover:text-primary duration-300" />
									{!link.iconOnly && link.label}
								</NavLink>
							);
						})}
					</nav>

					<div className="ml-auto flex items-center gap-1.5 sm:gap-3">
						{/* Notifications */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-subtle hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
									aria-label="Open notifications"
								>
									<Bell className="h-4 w-4" />
									{unreadCount > 0 && (
										<>
											<span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none z-20">
												{unreadCount > 99
													? "99+"
													: unreadCount}
											</span>
											<span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/50 text-[9px] font-bold text-primary-foreground leading-none animate-ping"></span>
										</>
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-[calc(100vw-2rem)] max-w-80 sm:w-80"
							>
								<DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
									<span className="text-sm font-semibold text-foreground">
										Notifications
									</span>
									{unreadCount > 0 && (
										<span className="text-xs text-muted-foreground">
											{unreadCount} unread
										</span>
									)}
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<div className="max-h-72 overflow-y-auto">
									{notifications.length === 0 ? (
										<div className="px-3 py-6 text-center text-xs text-muted-foreground">
											You're all caught up.
										</div>
									) : (
										notifications
											.slice(0, 8)
											.map((notif) => (
												<DropdownMenuItem
													key={notif.id}
													className="flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer"
													onSelect={() =>
														handleNotificationClick(
															notif,
														)
													}
												>
													<div className="flex w-full items-start gap-2">
														{!notif.read && (
															<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
														)}
														<div
															className={cn(
																"flex-1",
																notif.read &&
																	"pl-3.5",
															)}
														>
															<p className="text-xs font-medium text-foreground leading-snug">
																{notif.title}
															</p>
															{notif.body && (
																<p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
																	{notif.body}
																</p>
															)}
														</div>
														<span className="shrink-0 text-[10px] text-muted-foreground">
															{formatRelativeTime(
																notif.created_at,
															)}
														</span>
													</div>
												</DropdownMenuItem>
											))
									)}
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="justify-center text-xs text-primary font-medium py-2"
									onSelect={() =>
										setNotificationsDialogOpen(true)
									}
								>
									View all notifications
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Account */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="flex items-center gap-2 rounded-md p-1 sm:py-1 sm:px-2 sm:border sm:border-border/50 transition-colors hover:bg-muted-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
									aria-label="Open account menu"
								>
									<Avatar className="h-7 w-7">
										{user?.avatar_url && (
											<AvatarImage
												src={user?.avatar_url}
												alt={displayName}
											/>
										)}
										<AvatarFallback className="text-[10px]">
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="hidden leading-none text-left lg:block">
										<div className="text-xs font-medium text-foreground">
											{displayName}
										</div>
										<div className="text-[10px] text-muted">
											{role}
										</div>
									</div>
									<ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="px-3 py-2 flex flex-col items-center justify-center">
									<div className="my-2">
										<Avatar className="h-10 w-10">
											{user?.avatar_url && (
												<AvatarImage
													src={user?.avatar_url}
													alt={displayName}
												/>
											)}
											<AvatarFallback className="text-[10px]">
												{initials}
											</AvatarFallback>
										</Avatar>
									</div>
									<p className="text-sm font-bold text-primary">
										{displayName}
									</p>
									<div>
										<p className="text-xs font-light text-muted-foreground break-all text-center">
											{user?.email ?? "alex@taskhub.io"}
										</p>
									</div>
									<SprintCapacity userId={user?.id} />
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<div className="flex items-center justify-between gap-2 px-3 py-1.5">
									<p className="text-xs font-medium text-muted-foreground">
										Theme
									</p>
									<ThemeToggle />
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="gap-2 px-3"
									onSelect={() => navigate("/profile")}
								>
									<User className="h-4 w-4 text-muted-foreground" />
									Profile
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="gap-2 px-3 text-danger focus:text-danger focus:bg-danger/10"
									onSelect={handleLogout}
								>
									<LogOut className="h-4 w-4" />
									Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{mobileNavOpen && (
					<nav
						id="mobile-header-menu"
						className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-border bg-surface px-4 py-2 shadow-sm lg:hidden"
						aria-label="Mobile navigation"
					>
						<div className="mx-auto flex max-w-[1280px] flex-col gap-1">
							{visibleNavLinks.map((link) => {
								const Icon = link.icon;
								return (
									<NavLink
										key={link.to}
										to={link.to}
										end={link.end}
										onClick={() => setMobileNavOpen(false)}
										className={({ isActive }) =>
											cn(
												"flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
												isActive
													? "bg-primary-subtle font-medium text-primary"
													: "text-muted-foreground hover:bg-muted-subtle hover:text-foreground",
											)
										}
									>
										<Icon className="h-4 w-4 shrink-0" />
										{link.label}
									</NavLink>
								);
							})}
						</div>
					</nav>
				)}
			</header>

			<main className="flex-1">
				<Outlet />
			</main>

			<footer className="border-t border-border bg-surface">
				<div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 py-5 sm:px-5 md:flex-row md:px-6">
					<Link to="/" aria-label="TaskHub home">
						<img
							src="/logo.svg"
							alt="TaskHub"
							className="h-7 w-auto max-w-[120px]"
						/>
					</Link>

					<nav
						aria-label="Footer navigation"
						className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
					>
						<a
							href="/whats-new"
							className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
						>
							What's New
						</a>
						<a
							href="/terms"
							className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
						>
							Terms
						</a>
						<a
							href="/privacy"
							className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
						>
							Privacy
						</a>
						<a
							href="/contact"
							className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
						>
							Contact
						</a>
					</nav>
					<p className="text-xs text-muted-foreground/80">
						Powered by UP-TO-DATE WebDesign | © 2026 TaskHub.
						Alrights Reserved.
					</p>
				</div>
			</footer>

			<Dialog
				open={notificationsDialogOpen}
				onOpenChange={setNotificationsDialogOpen}
			>
				<DialogContent className="max-w-[560px] p-5">
					<DialogHeader className="mb-3 pb-0">
						<DialogTitle>Notifications</DialogTitle>
						<DialogDescription>
							Review your recent workspace activity and task
							updates.
						</DialogDescription>
					</DialogHeader>

					<div className="flex items-center justify-between border-y border-border py-3">
						<span className="text-sm font-medium text-foreground">
							All notifications
						</span>
						<div className="flex items-center gap-3">
							{unreadCount > 0 && (
								<span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
									{unreadCount} unread
								</span>
							)}
							{unreadCount > 0 && (
								<button
									type="button"
									onClick={() => markAllRead()}
									className="text-xs font-medium text-primary hover:underline"
								>
									Mark all read
								</button>
							)}
						</div>
					</div>

					<div className="max-h-[60vh] overflow-y-auto py-2">
						{notifications.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								No notifications yet.
							</div>
						) : (
							notifications.map((notif) => (
								<button
									key={notif.id}
									type="button"
									onClick={() => {
										setNotificationsDialogOpen(false);
										handleNotificationClick(notif);
									}}
									className={cn(
										"flex w-full gap-3 border-b border-border py-3 last:border-b-0 text-left transition-colors hover:bg-muted-subtle",
										!notif.read && "bg-primary-subtle/30",
									)}
								>
									<span
										className={cn(
											"mt-2 h-2 w-2 shrink-0 rounded-full",
											!notif.read
												? "bg-primary"
												: "bg-transparent",
										)}
										aria-hidden="true"
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-3">
											<p className="text-sm font-medium leading-snug text-foreground">
												{notif.title}
											</p>
											<span className="shrink-0 text-xs text-muted-foreground">
												{formatRelativeTime(
													notif.created_at,
												)}
											</span>
										</div>
										{notif.body && (
											<p className="mt-1 text-sm leading-snug text-muted-foreground">
												{notif.body}
											</p>
										)}
									</div>
								</button>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
