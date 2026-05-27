import * as React from "react";
import Select, {
	type ClassNamesConfig,
	type GroupBase,
	type OptionProps,
	type SelectComponentsConfig,
	type SingleValueProps,
	components as RSComponents,
} from "react-select";
import { cn } from "@/lib/utils";

export type SearchableSelectOption<TMeta = unknown> = {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
	meta?: TMeta;
};

export interface SearchableSelectProps<TMeta = unknown> {
	value?: string | null;
	onValueChange: (value: string) => void;
	options: SearchableSelectOption<TMeta>[];
	placeholder?: string;
	/**
	 * react-select has no dedicated search-input slot; the in-control input
	 * doubles as both. Kept for prop-shape parity with the legacy SearchSelect.
	 */
	searchPlaceholder?: string;
	emptyMessage?: string;
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
	contentClassName?: string;
	error?: boolean;
	loading?: boolean;
	autoFocus?: boolean;
	defaultMenuIsOpen?: boolean;
	onMenuClose?: () => void;
	size?: "sm" | "md";
	name?: string;
	id?: string;
	ariaLabel?: string;
	renderOption?: (opt: SearchableSelectOption<TMeta>) => React.ReactNode;
	renderValue?: (opt: SearchableSelectOption<TMeta>) => React.ReactNode;
	filterOption?: (opt: SearchableSelectOption<TMeta>, raw: string) => boolean;
}

type RSOption<TMeta> = SearchableSelectOption<TMeta>;
type RSGroup<TMeta> = GroupBase<RSOption<TMeta>>;

const PORTAL_TARGET =
	typeof document !== "undefined" ? document.body : undefined;

export function SearchableSelect<TMeta = unknown>({
	value,
	onValueChange,
	options,
	placeholder,
	emptyMessage = "No results",
	clearable = false,
	disabled = false,
	className,
	contentClassName,
	error = false,
	loading = false,
	autoFocus,
	defaultMenuIsOpen,
	onMenuClose,
	size = "md",
	name,
	id,
	ariaLabel,
	renderOption,
	renderValue,
	filterOption,
}: SearchableSelectProps<TMeta>) {
	const selectedOption = React.useMemo(
		() => options.find((o) => o.value === value) ?? null,
		[options, value],
	);

	const classNames: ClassNamesConfig<
		RSOption<TMeta>,
		false,
		RSGroup<TMeta>
	> = React.useMemo(
		() => ({
			control: ({ isFocused, isDisabled }) =>
				cn(
					"flex w-full items-center justify-between rounded-lg border bg-surface px-3 text-sm text-foreground transition",
					size === "sm" ? "min-h-8 py-0.5" : "min-h-9 py-1",
					isFocused
						? "border-primary ring-2 ring-primary"
						: "border-border-strong",
					isDisabled && "cursor-not-allowed opacity-50",
					error && "border-danger",
					className,
				),
			valueContainer: () => "gap-1 p-0",
			placeholder: () => "text-muted",
			singleValue: () => "text-foreground",
			input: () =>
				"text-sm text-foreground [&_input]:focus:ring-0 [&_input]:focus:outline-none",
			indicatorsContainer: () => "gap-1",
			indicatorSeparator: () => "hidden",
			dropdownIndicator: ({ isFocused }) =>
				cn(
					"text-muted hover:text-foreground px-1",
					isFocused && "text-foreground",
				),
			clearIndicator: () =>
				"text-muted hover:text-foreground cursor-pointer px-1",
			menu: () =>
				cn(
					"z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-[0px_4px_12px_rgba(0,0,0,0.06)]",
					contentClassName,
				),
			menuList: () => "p-1 max-h-72",
			option: ({ isFocused, isSelected, isDisabled }) =>
				cn(
					"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2 text-sm outline-none",
					isFocused && !isSelected && "bg-muted-subtle",
					isSelected && "bg-primary-subtle text-primary",
					isDisabled && "pointer-events-none opacity-50",
				),
			noOptionsMessage: () => "py-6 text-center text-sm text-muted",
			loadingMessage: () => "py-6 text-center text-sm text-muted",
			loadingIndicator: () => "text-muted",
		}),
		[size, error, className, contentClassName],
	);

	const components = React.useMemo(() => {
		const c: SelectComponentsConfig<
			RSOption<TMeta>,
			false,
			RSGroup<TMeta>
		> = {
			IndicatorSeparator: () => null,
		};
		if (renderOption) {
			c.Option = (
				props: OptionProps<RSOption<TMeta>, false, RSGroup<TMeta>>,
			) => (
				<RSComponents.Option {...props}>
					{renderOption(props.data)}
				</RSComponents.Option>
			);
		} else {
			c.Option = (
				props: OptionProps<RSOption<TMeta>, false, RSGroup<TMeta>>,
			) => (
				<RSComponents.Option {...props}>
					<div className="flex w-full items-center justify-between gap-2">
						<span className="truncate">{props.data.label}</span>
						{props.data.description && (
							<span className="text-xs text-muted truncate">
								{props.data.description}
							</span>
						)}
					</div>
				</RSComponents.Option>
			);
		}
		if (renderValue) {
			c.SingleValue = (
				props: SingleValueProps<RSOption<TMeta>, false, RSGroup<TMeta>>,
			) => (
				<RSComponents.SingleValue {...props}>
					{renderValue(props.data)}
				</RSComponents.SingleValue>
			);
		}
		return c;
	}, [renderOption, renderValue]);

	const handleFilterOption = React.useMemo(() => {
		if (filterOption) {
			return (candidate: { data: RSOption<TMeta> }, raw: string) =>
				filterOption(candidate.data, raw);
		}
		return (candidate: { data: RSOption<TMeta> }, raw: string) => {
			const q = raw.trim().toLowerCase();
			if (!q) return true;
			const d = candidate.data;
			return (
				d.label.toLowerCase().includes(q) ||
				(d.description ?? "").toLowerCase().includes(q)
			);
		};
	}, [filterOption]);

	return (
		<Select<RSOption<TMeta>, false, RSGroup<TMeta>>
			inputId={id}
			name={name}
			aria-label={ariaLabel}
			value={selectedOption}
			onChange={(opt) => onValueChange(opt ? opt.value : "")}
			options={options}
			isOptionDisabled={(o) => !!o.disabled}
			isClearable={clearable}
			isDisabled={disabled}
			isLoading={loading}
			placeholder={placeholder}
			noOptionsMessage={() => emptyMessage}
			autoFocus={autoFocus}
			defaultMenuIsOpen={defaultMenuIsOpen}
			onMenuClose={onMenuClose}
			unstyled
			classNames={classNames}
			components={components}
			filterOption={handleFilterOption}
			menuPortalTarget={PORTAL_TARGET}
			menuPosition="fixed"
			styles={{
				menuPortal: (base) => ({ ...base, zIndex: 60 }),
			}}
			theme={(t) => ({
				...t,
				borderRadius: 8,
				colors: {
					...t.colors,
					primary: "#0058be",
					primary25: "#eff5ff",
					primary50: "#dbeafe",
					primary75: "#bfdbfe",
					neutral20: "#c2c6d6",
					neutral30: "#c2c6d6",
				},
			})}
		/>
	);
}
