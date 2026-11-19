import { Environment } from '../../types'
import { FeedbackInput, FeedbackType } from './boardTools'

/** Who sent the feedback, as the server sees it rather than as the agent describes itself. */
export interface FeedbackSender {
	userId: string
	/** The app we recognise from the OAuth client id, such as `claude`, or null. */
	agentClient: string | null
	/** The OAuth client id itself: for an unrecognised client, the only way to tell which it was. */
	clientId: string | null
	userAgent: string | null
	/**
	 * The call came through the Codex app's proxy Worker, which names itself in its User-Agent. A label
	 * for triage, not a security check: any caller can send that User-Agent.
	 */
	viaCodexApp: boolean
}

/** False on a deployment without the webhook. Local dev logs the post instead, so it counts. */
export function isMcpFeedbackConfigured(env: Environment) {
	return !!env.DISCORD_MCP_FEEDBACK_WEBHOOK_URL || !!env.IS_LOCAL
}

const TYPE_LABELS: Record<FeedbackType, string> = {
	bug: '🐛 Bug',
	feature_request: '💡 Feature request',
	other: '💬 Other',
}

const COLORS: Record<FeedbackType, number> = {
	bug: 0xe5484d,
	feature_request: 0x3e63dd,
	other: 0x8b8d98,
}

// Header and client id are caller-controlled and unbounded; Discord refuses a field value over 1024.
const RAW_FIELD_MAX_LENGTH = 200

const FEEDBACK_WEBHOOK_TIMEOUT_MS = 5_000

export async function sendMcpFeedback(
	env: Environment,
	input: FeedbackInput,
	sender: FeedbackSender
): Promise<void> {
	const payload = getFeedbackPayload(env, input, sender)
	const webhookUrl = env.DISCORD_MCP_FEEDBACK_WEBHOOK_URL
	if (!webhookUrl) {
		// eslint-disable-next-line no-console
		console.log('MCP feedback:', JSON.stringify(payload, null, 2))
		return
	}

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		// A hung webhook would otherwise hold the agent's tool call open; the abort lands in the
		// tool's feedback_send_error path.
		signal: AbortSignal.timeout(FEEDBACK_WEBHOOK_TIMEOUT_MS),
	})
	if (!res.ok) {
		const body = await res.text().catch(() => '')
		throw new DiscordWebhookError(res.status, body.slice(0, DISCORD_ERROR_DETAIL_MAX_LENGTH))
	}
}

// Discord's error bodies name the payload fields it rejected, which is what makes a 400 debuggable,
// but they are unbounded.
const DISCORD_ERROR_DETAIL_MAX_LENGTH = 500

// `message` stays `Discord webhook failed (<status>)` so Sentry groups on it; a varying body there
// would split one recurring issue into many. The body goes to the event's context instead, via
// feedbackErrorContext.
export class DiscordWebhookError extends Error {
	constructor(
		readonly status: number,
		readonly detail: string
	) {
		super(`Discord webhook failed (${status})`)
		this.name = 'DiscordWebhookError'
	}
}

/** Sentry context for a failed send, merged into the tool's extras. */
export function feedbackErrorContext(error: unknown): Record<string, unknown> {
	if (!(error instanceof DiscordWebhookError)) return {}
	return {
		discord_status: error.status,
		discord_detail: error.detail || '(no response body)',
	}
}

export function getFeedbackPayload(env: Environment, input: FeedbackInput, sender: FeedbackSender) {
	const fields = [
		{ name: 'Type', value: TYPE_LABELS[input.type], inline: true },
		{
			name: 'Source',
			value: sender.viaCodexApp ? 'Codex app' : 'dotcom MCP server',
			inline: true,
		},
		{ name: 'Agent', value: input.agent ?? 'Not given', inline: true },
		{ name: 'Client', value: sender.agentClient ?? 'Unrecognised', inline: true },
		// The full id, so the team can find the account to follow up or reproduce. The channel is internal.
		{ name: 'User', value: codeValue(sender.userId) },
		{ name: 'Client id', value: codeValue(sender.clientId) },
		{ name: 'User-Agent', value: codeValue(sender.userAgent) },
	]

	return {
		username: `MCP feedback (${env.WORKER_NAME ?? 'localhost'})`,
		// Everything below is agent-written, so an `@everyone` in it must not ping the channel.
		allowed_mentions: { parse: [] },
		embeds: [
			{
				title: 'MCP feedback',
				color: COLORS[input.type],
				description: input.message,
				fields,
			},
		],
	}
}

function codeValue(value: string | null) {
	if (!value) return 'None'
	const clipped =
		value.length > RAW_FIELD_MAX_LENGTH ? `${value.slice(0, RAW_FIELD_MAX_LENGTH)}…` : value
	// A backtick in the value would close the code span early.
	return `\`${clipped.replaceAll('`', "'")}\``
}
