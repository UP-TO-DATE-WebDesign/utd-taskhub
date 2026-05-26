import { useState, useEffect } from "react";
import {
	Settings,
	Users,
	Lock,
	FileClock,
	Tags,
	Trash2,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSection } from "@/components/workspace-settings/GeneralSection";
import { MembersSection } from "@/components/workspace-settings/MembersSection";
import { RolePermissionsSection } from "@/components/workspace-settings/RolePermissionsSection";
import { SystemLogsSection } from "@/components/workspace-settings/SystemLogsSection";
import { TaskTypesSection } from "@/components/workspace-settings/TaskTypesSection";
import { TrashSection } from "@/components/workspace-settings/TrashSection";

interface SettingsNavItem {
	id: string;
	label: string;
	icon: LucideIcon;
	danger?: boolean;
}

const navItems: SettingsNavItem[] = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "role-permissions", label: "Role Permissions", icon: Lock },
	{ id: "members", label: "Members & Roles", icon: Users },
	{ id: "task-types", label: "Task Types", icon: Tags },
	{ id: "system-logs", label: "System Logs", icon: FileClock },
	{ id: "trash", label: "Trash", icon: Trash2 },
	// { id: "boards", label: "Boards & Workflow", icon: LayoutDashboard },
	// { id: "tickets", label: "Tickets", icon: Ticket },
	// { id: "notifications", label: "Notifications", icon: Bell },
	// { id: "integrations", label: "Integrations", icon: Plug },
	// { id: "security", label: "Security", icon: Shield },
	// { id: "danger", label: "Danger Zone", icon: AlertOctagon, danger: true },
];

const sectionOrder = navItems.map((item) => item.id);

export default function SettingsPage() {
	const [activeSection, setActiveSection] = useState("general");

	useEffect(() => {
		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						visible.add(entry.target.id);
					} else {
						visible.delete(entry.target.id);
					}
				});
				const active = sectionOrder.find((id) => visible.has(id));
				if (active) setActiveSection(active);
			},
			{ rootMargin: "-20% 0px -70% 0px" },
		);
		sectionOrder.forEach((id) => {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		});
		return () => observer.disconnect();
	}, []);

	function scrollToSection(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "nearest" });
		} else {
			setActiveSection(id);
		}
	}

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold text-foreground">
					Workspace Settings
				</h1>
				<p className="text-sm text-muted mt-0.5">
					Manage your workspace's identity, team, and security
					preferences.
				</p>
			</div>

			{/* Mobile/tablet nav strip */}
			<div className="mb-6 overflow-x-auto lg:hidden">
				<div className="flex gap-1 border-b border-border pb-2">
					{navItems.map(({ id, label, icon: Icon, danger }) => (
						<button
							key={id}
							onClick={() => scrollToSection(id)}
							className={cn(
								"flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
								activeSection === id
									? danger
										? "bg-danger-subtle text-danger font-medium"
										: "bg-primary-subtle text-primary font-medium"
									: danger
										? "text-danger hover:bg-danger-subtle"
										: "text-muted-foreground hover:bg-muted-subtle hover:text-foreground",
							)}
						>
							<Icon className="h-3.5 w-3.5 shrink-0" />
							{label}
						</button>
					))}
				</div>
			</div>

			<div className="flex gap-8 items-start">
				{/* Sidebar — desktop only */}
				<nav className="hidden w-52 shrink-0 sticky top-22 lg:block">
					<ul className="space-y-0.5">
						{navItems.map(({ id, label, icon: Icon, danger }) => (
							<li key={id}>
								<button
									onClick={() => scrollToSection(id)}
									className={cn(
										"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
										activeSection === id
											? danger
												? "bg-danger-subtle text-danger font-medium"
												: "bg-primary-subtle text-primary font-medium"
											: danger
												? "text-danger hover:bg-danger-subtle"
												: "text-muted-foreground hover:bg-muted-subtle hover:text-foreground",
									)}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{label}
								</button>
							</li>
						))}
					</ul>
				</nav>

				{/* Content */}
				<div className="flex-1 space-y-6 min-w-0">
					<div id="general">
						<GeneralSection />
					</div>
					<div id="role-permissions">
						<RolePermissionsSection />
					</div>
					<div id="members">
						<MembersSection />
					</div>
					<div id="task-types">
						<TaskTypesSection />
					</div>
					<div id="system-logs">
						<SystemLogsSection />
					</div>
					<div id="trash">
						<TrashSection />
					</div>
					{/* <div id="boards">
						<BoardsSection />
					</div>
					<div id="tickets">
						<TicketsSection />
					</div>
					<div id="notifications">
						<NotificationsSection />
					</div>
					<div id="integrations">
						<IntegrationsSection />
					</div>
					<div id="security">
						<SecuritySection />
					</div>
					<div id="danger">
						<DangerZoneSection />
					</div> */}
				</div>
			</div>
		</div>
	);
}
