import crypto from "crypto";

// Ephemeral, single-use handshake tickets for SSE.
// Issued via authenticated POST /notifications/stream/ticket and consumed
// by GET /notifications/stream?ticket=... so the long-lived JWT never
// appears in URLs or access logs.

const TICKETS = new Map(); // ticket -> { userId, expiresAt }
const TTL_MS = 30_000;

function prune(now = Date.now()) {
	for (const [t, entry] of TICKETS) {
		if (entry.expiresAt <= now) TICKETS.delete(t);
	}
}

export function issueTicket(userId) {
	prune();
	const ticket = crypto.randomBytes(32).toString("hex");
	TICKETS.set(ticket, {
		userId,
		expiresAt: Date.now() + TTL_MS,
	});
	return { ticket, expiresIn: Math.floor(TTL_MS / 1000) };
}

export function consumeTicket(ticket) {
	if (!ticket || typeof ticket !== "string") return null;
	const entry = TICKETS.get(ticket);
	if (!entry) return null;
	TICKETS.delete(ticket); // single-use
	if (entry.expiresAt <= Date.now()) return null;
	return entry.userId;
}
