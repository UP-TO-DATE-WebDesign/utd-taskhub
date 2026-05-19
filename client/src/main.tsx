import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import "react-day-picker/style.css";
import App from "./App.tsx";
import "@mantine/core/styles.css";
import { AuthProvider } from "@/context/AuthContext";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

if (import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
		],
		tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
		replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1),
		replaysOnErrorSampleRate: 1.0,
	});
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Sentry.ErrorBoundary fallback={<div className="p-6">Something went wrong.</div>}>
			<AuthProvider>
				<MantineProvider>
					<SWRConfig
						value={{
							revalidateOnFocus: true,
							revalidateOnReconnect: true,
							dedupingInterval: 5000,
							errorRetryCount: 2,
							errorRetryInterval: 2000,
							shouldRetryOnError: (err) =>
								!/Session expired/i.test(err.message),
						}}
					>
						<App />
					</SWRConfig>
				</MantineProvider>
			</AuthProvider>
		</Sentry.ErrorBoundary>
	</StrictMode>,
);
