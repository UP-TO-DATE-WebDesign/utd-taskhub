import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import DevUpdatesTab from "./dev-updates/DevUpdatesTab";
import DevReportsTab from "./dev-updates/DevReportsTab";

const TABS = ["Dev Updates", "Dev Reports"] as const;
type Tab = (typeof TABS)[number];

export default function DevUpdatesReportsCard() {
	const [activeTab, setActiveTab] = useState<Tab>("Dev Updates");

	return (
		<Card className="p-5">
			<div className="mb-4 flex items-center gap-2">
				<Sparkles className="h-5 w-5 text-primary" />
				<h3 className="text-lg font-semibold text-foreground">
					Dev Updates & Reports
				</h3>
			</div>

			<div className="mb-5 flex gap-1 border-b border-border">
				{TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab
								? "border-primary text-primary"
								: "border-transparent text-muted hover:text-foreground"
						}`}
					>
						{tab}
					</button>
				))}
			</div>

			{activeTab === "Dev Updates" ? <DevUpdatesTab /> : <DevReportsTab />}
		</Card>
	);
}
