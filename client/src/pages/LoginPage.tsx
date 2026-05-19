import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function LoginPage() {
	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const message = (location.state as { toast?: string } | null)?.toast;
		if (message) toast.success(message);
	}, []);

	useEffect(() => {
		if (isAuthenticated) navigate("/");
	}, [isAuthenticated]);

	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	if (isAuthenticated) return <Navigate to="/" replace />;

	function handleGoogleSignIn() {
		const apiUrl =
			import.meta.env.VITE_API_URL ?? "http://localhost:5050/api/v1";
		window.location.href = `${apiUrl}/auth/google`;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		if (!email || !password) {
			setError("Please fill in all fields.");
			return;
		}
		setLoading(true);
		try {
			await login(email, password, true);
			navigate("/");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-svh bg-background lg:min-h-screen">
			{/* Left panel */}
			<div className="hidden w-[420px] shrink-0 flex-col justify-between bg-primary/90 p-8 xl:flex xl:w-[480px] xl:p-10">
				<Link
					to="/"
					aria-label="TaskHub home"
					className="flex items-center"
				>
					<img
						src="/favicon.svg"
						alt="TaskHub"
						className="h-10 w-10"
					/>
					<span className="ml-2 text-primary-foreground text-lg font-bold tracking-tight">
						TaskHub
					</span>
				</Link>

				<div>
					<blockquote className="text-primary-foreground/90 text-2xl font-semibold leading-snug tracking-tight mb-4">
						"Focused engineering requires visual quiet and clarity."
					</blockquote>
					<p className="text-primary-foreground/60 text-sm leading-relaxed">
						Manage sprints, track issues, and ship faster all from
						one focused workspace built for engineering teams.
					</p>

					<div className="mt-10 grid grid-cols-3 gap-4">
						{[
							{ label: "Active Teams", value: "240+" },
							{ label: "Tasks Shipped", value: "18k" },
							{ label: "Uptime", value: "99.9%" },
						].map((stat) => (
							<div
								key={stat.label}
								className="rounded-lg bg-primary-foreground/10 px-4 py-3"
							>
								<p className="text-primary-foreground text-xl font-bold">
									{stat.value}
								</p>
								<p className="text-primary-foreground/60 text-xs mt-0.5">
									{stat.label}
								</p>
							</div>
						))}
					</div>
				</div>

				<p className="text-primary-foreground/30 text-xs">
					© 2026 TaskHub. All rights reserved.
				</p>
			</div>

			{/* Right panel */}
			<div className="flex min-h-svh flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:px-6 sm:py-10 lg:min-h-screen lg:px-10 xl:px-6 xl:py-12">
				<div className="w-full max-w-[400px]">
					<Link
						to="/"
						aria-label="TaskHub home"
						className="mb-8 flex items-center justify-center xl:hidden"
					>
						<img
							src="/logo.svg"
							alt="TaskHub"
							className="h-8 w-auto max-w-full"
						/>
					</Link>

					<div className="mb-6 sm:mb-8">
						<h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
							Welcome back
						</h1>
						<p className="text-sm text-muted">
							Sign in to your workspace to continue.
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
								htmlFor="email"
								className="block text-sm font-medium text-muted-foreground mb-1.5"
							>
								Email address
							</label>
							<Input
								id="email"
								type="email"
								placeholder="you@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								autoComplete="email"
								className={cn(
									error &&
										!email &&
										"border-danger focus-visible:ring-danger",
								)}
							/>
						</div>

						<div>
							<div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
								<label
									htmlFor="password"
									className="text-sm font-medium text-muted-foreground"
								>
									Password
								</label>
								<a
									href="#"
									className="text-xs text-primary hover:underline focus:outline-none focus-visible:underline"
								>
									Forgot password?
								</a>
							</div>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="••••••••"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									autoComplete="current-password"
									className={cn(
										"pr-10",
										error &&
											!password &&
											"border-danger focus-visible:ring-danger",
									)}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
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
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={loading}
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
									Signing in…
								</span>
							) : (
								<span className="flex items-center gap-2">
									Sign in <ArrowRight className="h-4 w-4" />
								</span>
							)}
						</Button>
					</form>

					<div className="my-4 flex items-center gap-3">
						<Separator className="flex-1" />
						<span className="shrink-0 text-xs text-muted">
							or sign in with email
						</span>
						<Separator className="flex-1" />
					</div>

					<Button
						variant="outline"
						className="w-full mb-4 gap-2"
						type="button"
						onClick={handleGoogleSignIn}
					>
						<svg
							viewBox="0 0 24 24"
							className="h-4 w-4"
							aria-hidden="true"
						>
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Continue with Google
					</Button>

					<p className="mt-6 text-center text-sm text-muted">
						Don't have an account?{" "}
						<Link
							to="/register"
							className="text-primary font-medium hover:underline"
						>
							Request access
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
