export function notFoundHandler(req, res, next) {
	res.status(404).json({
		success: false,
		message: `Route not found: ${req.originalUrl}`,
	});
}

export function errorHandler(error, req, res, next) {
	console.error(error);

	const raw = error.statusCode ?? error.status ?? 500;
	const parsed = Number(raw);
	const statusCode =
		Number.isInteger(parsed) && parsed >= 100 && parsed < 600 ? parsed : 500;

	res.status(statusCode).json({
		success: false,
		message: error.message || "Internal server error",
		details:
			process.env.NODE_ENV === "development" ? error.details : undefined,
	});
}
