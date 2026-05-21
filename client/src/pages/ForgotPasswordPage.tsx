import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/services/auth.service";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		const trimmed = email.trim();
		if (!trimmed) {
			setError("Please enter your email.");
			return;
		}
		setLoading(true);
		try {
			await requestPasswordReset(trimmed);
			setSent(true);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Could not send reset email. Try again.",
			);
		} finally {
			setLoading(false);
		}
	}

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

				{sent ? (
					<div className="rounded-xl border border-border bg-surface p-6 text-center">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary">
							<MailCheck className="h-6 w-6" />
						</div>
						<h1 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
							Check your email
						</h1>
						<p className="text-sm text-muted">
							If an account exists for{" "}
							<span className="font-medium text-foreground">
								{email.trim()}
							</span>
							, we sent a link to reset your password.
						</p>
						<Link
							to="/login"
							className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
						>
							Back to sign in
						</Link>
					</div>
				) : (
					<>
						<div className="mb-6">
							<h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
								Forgot your password?
							</h1>
							<p className="text-sm text-muted">
								Enter your email and we'll send you a link to
								reset it.
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

							<Button
								type="submit"
								className="w-full"
								disabled={loading}
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
										Sending…
									</span>
								) : (
									<span className="flex items-center gap-2">
										Send reset link{" "}
										<ArrowRight className="h-4 w-4" />
									</span>
								)}
							</Button>
						</form>

						<p className="mt-6 text-center text-sm text-muted">
							Remember your password?{" "}
							<Link
								to="/login"
								className="text-primary font-medium hover:underline"
							>
								Sign in
							</Link>
						</p>
					</>
				)}
			</div>
		</div>
	);
}
