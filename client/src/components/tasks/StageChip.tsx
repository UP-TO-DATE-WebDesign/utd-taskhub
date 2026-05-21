export function StageChip({ label, color }: { label: string; color: string }) {
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
			style={{
				backgroundColor: `${color}1a`,
				color,
				border: `1px solid ${color}33`,
			}}
		>
			<span
				className="h-2 w-2 rounded-full"
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}

export function StageDot({ color }: { color: string }) {
	return (
		<span
			className="inline-block h-2 w-2 rounded-full mb-0.5"
			style={{ backgroundColor: color }}
		/>
	);
}
