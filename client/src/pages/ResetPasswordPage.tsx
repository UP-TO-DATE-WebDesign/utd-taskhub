import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { resetPassword } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const passwordRules = [
	{ label: "At least 8 characters", test: (v: string) => v.length >= 8 },
	{ label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
	{ label: "One number", test: (v: string) => /[0-9]/.test(v) },
];

type Stage = "validating" | "invalid" | "ready" | "success";

export default function ResetPasswordPage() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [stage, setStage] = useState<Stage>("validating");
	const [invalidMessage, setInvalidMessage] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!token) {
			setInvalidMessage(
				"Invalid or expired reset link. Request a new one to continue.",
			);
			setStage("invalid");
			return;
		}
		setStage("ready");
	}, [token]);

	function getStrengthCount(v: string) {
		return passwordRules.filter((r) => r.test(v)).length;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!password || !confirm) {
			setError("Please fill in both fields.");
			return;
		}
		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}
		if (getStrengthCount(password) < passwordRules.length) {
			setError("Password does not meet all requirements.");
			return;
		}

		setLoading(true);
		try {
			const { email } = await resetPassword(token, password);
			try {
				await login(email, password, false);
			} catch {
				// Auto sign-in failed; user can still log in manually.
			}
			setStage("success");
			toast.success("Password updated.");
			setTimeout(() => {
				navigate("/", { replace: true });
			}, 600);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Could not reset password. The link may have expired.",
			);
			setLoading(false);
		}
	}

	const strength = getStrengthCount(password);
	const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
	const strengthColor = ["", "bg-danger", "bg-warning", "bg-secondary"][
		strength
	];

	return (
		<div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
			<div className="w-full max-w-[400px]">
				<Link
					to="/"
					aria-label="TaskHub home"
					className="mb-8 flex items-center justify-center"
				>
					<img src="/favicon.svg" alt="TaskHub" className="h-9 w-9" />
					<span className="ml-2 text-lg font-bold tracking-tight text-foreground">
						TaskHub
					</span>
				</Link>

				{stage === "validating" && (
					<div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
						Validating reset link…
					</div>
				)}

				{stage === "invalid" && (
					<div className="rounded-xl border border-border bg-surface p-6 text-center">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
							<ShieldAlert className="h-6 w-6" />
						</div>
						<h1 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
							Link expired
						</h1>
						<p className="text-sm text-muted">{invalidMessage}</p>
						<Link
							to="/forgot-password"
							className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
						>
							Request a new link
						</Link>
					</div>
				)}

				{stage === "success" && (
					<div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
						Password updated. Redirecting…
					</div>
				)}

				{stage === "ready" && (
					<>
						<div className="mb-6">
							<h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
								Set a new password
							</h1>
							<p className="text-sm text-muted">
								Choose a strong password you don't use anywhere
								else.
							</p>
						</div>

						<form
							onSubmit={handleSubmit}
							noValidate
							className="space-y-4"
						>
							{error && (
								<div className="rounded-lg border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger">
									{error}
								</div>
							)}

							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-muted-foreground mb-1.5"
								>
									New password
								</label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										autoComplete="new-password"
										className={cn(
											"pr-10",
											error &&
												!password &&
												"border-danger focus-visible:ring-danger",
										)}
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword((v) => !v)
										}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted-foreground transition-colors focus:outline-none"
										aria-label={
											showPassword
												? "Hide password"
												: "Show password"
										}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>

								{password && (
									<div className="mt-2">
										<div className="flex gap-1 mb-1.5">
											{[0, 1, 2].map((i) => (
												<div
													key={i}
													className={cn(
														"h-1 flex-1 rounded-full transition-colors",
														i < strength
															? strengthColor
															: "bg-border",
													)}
												/>
											))}
										</div>
										<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
											<div className="flex flex-wrap gap-x-3 gap-y-1">
												{passwordRules.map((rule) => (
													<span
														key={rule.label}
														className={cn(
															"flex items-center gap-1 text-[10px] transition-colors",
															rule.test(password)
																? "text-secondary"
																: "text-muted",
														)}
													>
														<Check
															className={cn(
																"h-2.5 w-2.5",
																rule.test(
																	password,
																)
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														{rule.label}
													</span>
												))}
											</div>
											{strengthLabel && (
												<span
													className={cn(
														"shrink-0 text-[10px] font-medium",
														strength === 1 &&
															"text-danger",
														strength === 2 &&
															"text-warning",
														strength === 3 &&
															"text-secondary",
													)}
												>
													{strengthLabel}
												</span>
											)}
										</div>
									</div>
								)}
							</div>

							<div>
								<label
									htmlFor="confirm"
									className="block text-sm font-medium text-muted-foreground mb-1.5"
								>
									Confirm new password
								</label>
								<div className="relative">
									<Input
										id="confirm"
										type={showConfirm ? "text" : "password"}
										placeholder="••••••••"
										value={confirm}
										onChange={(e) =>
											setConfirm(e.target.value)
										}
										autoComplete="new-password"
										className={cn(
											"pr-10",
											confirm &&
												password !== confirm &&
												"border-danger focus-visible:ring-danger",
										)}
									/>
									<button
										type="button"
										onClick={() => setShowConfirm((v) => !v)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted-foreground transition-colors focus:outline-none"
										aria-label={
											showConfirm
												? "Hide password"
												: "Show password"
										}
									>
										{showConfirm ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
								{confirm && password !== confirm && (
									<p className="text-[11px] text-danger mt-1">
										Passwords do not match.
									</p>
								)}
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={loading}
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
										Updating…
									</span>
								) : (
									<span className="flex items-center gap-2">
										Update password{" "}
										<ArrowRight className="h-4 w-4" />
									</span>
								)}
							</Button>
						</form>

						<p className="mt-6 text-center text-sm text-muted">
							<button
								type="button"
								onClick={() => navigate("/login")}
								className="text-primary font-medium hover:underline"
							>
								Cancel and sign in
							</button>
						</p>
					</>
				)}
			</div>
		</div>
	);
}
