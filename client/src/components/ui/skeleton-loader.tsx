type SkeletonLoaderProps = {
	className?: string;
};

export default function SkeletonLoader({
	className = "",
}: SkeletonLoaderProps) {
	return (
		<div
			className={`animate-pulse rounded-md bg-border ${className}`}
		/>
	);
}
