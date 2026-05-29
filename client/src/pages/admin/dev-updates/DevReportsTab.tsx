const DEV_REPORTS_URL = "https://contentkit.uptodatesites.com/dev-reports";

export default function DevReportsTab() {
	return (
		<div className="h-[70vh] w-full overflow-hidden rounded-md border border-border">
			<iframe
				src={DEV_REPORTS_URL}
				title="Dev Reports"
				className="h-full w-full"
			/>
		</div>
	);
}
