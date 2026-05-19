import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
};

export interface SearchSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	options: SearchSelectOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
	contentClassName?: string;
}

export function SearchSelect({
	value,
	onValueChange,
	options,
	placeholder,
	searchPlaceholder = "Search...",
	emptyMessage = "No results",
	clearable = false,
	disabled = false,
	className,
	contentClassName,
}: SearchSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setQuery("");
	};

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => {
			return (
				o.label.toLowerCase().includes(q) ||
				o.description?.toLowerCase().includes(q)
			);
		});
	}, [options, query]);

	const selected = options.find((o) => o.value === value);
	const showClear = clearable && !!value && !disabled;

	return (
		<SelectPrimitive.Root
			value={value}
			onValueChange={onValueChange}
			open={open}
			onOpenChange={handleOpenChange}
			disabled={disabled}
		>
			<div className="relative">
				<SelectPrimitive.Trigger
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
						showClear && "pr-9",
						className,
					)}
				>
					<SelectPrimitive.Value placeholder={placeholder}>
						{selected ? selected.label : undefined}
					</SelectPrimitive.Value>
					{!showClear && (
						<SelectPrimitive.Icon asChild>
							<ChevronDown className="h-4 w-4 text-muted" />
						</SelectPrimitive.Icon>
					)}
				</SelectPrimitive.Trigger>
				{showClear && (
					<button
						type="button"
						aria-label="Clear"
						className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded text-muted hover:text-foreground hover:bg-muted-subtle"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onValueChange("");
						}}
						onPointerDown={(e) => e.stopPropagation()}
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			<SelectPrimitive.Portal>
				<SelectPrimitive.Content
					position="popper"
					sideOffset={4}
					className={cn(
						"relative z-50 max-h-96 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-[0px_4px_12px_rgba(0,0,0,0.06)]",
						contentClassName,
					)}
					onCloseAutoFocus={(e) => {
						e.preventDefault();
					}}
				>
					<div
						className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-2 py-2"
						onPointerDown={(e) => e.stopPropagation()}
					>
						<Search className="h-4 w-4 text-muted shrink-0" />
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => e.stopPropagation()}
							placeholder={searchPlaceholder}
							className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
							autoFocus
						/>
					</div>
					<SelectPrimitive.Viewport className="p-1 max-h-72 overflow-y-auto">
						{filtered.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted">
								{emptyMessage}
							</div>
						) : (
							filtered.map((opt) => (
								<SelectPrimitive.Item
									key={opt.value}
									value={opt.value}
									disabled={opt.disabled}
									className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-muted-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
								>
									<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
										<SelectPrimitive.ItemIndicator>
											<Check className="h-4 w-4 text-primary" />
										</SelectPrimitive.ItemIndicator>
									</span>
									<SelectPrimitive.ItemText>
										{opt.label}
									</SelectPrimitive.ItemText>
									{opt.description && (
										<span className="ml-2 text-xs text-muted truncate">
											{opt.description}
										</span>
									)}
								</SelectPrimitive.Item>
							))
						)}
					</SelectPrimitive.Viewport>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
}
