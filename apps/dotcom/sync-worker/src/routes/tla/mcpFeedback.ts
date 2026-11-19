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
	/** The `CF-Worker` header: set when another Cloudflare Worker, such as the Codex app, proxied the call. */
	cfWorker: string | null
}

export type SendFeedbackResult = { ok: true } | { ok: false; reason: 'feedback_not_configured' }

const TYPE_LABELS: Record<FeedbackType, string> = {
	bug: '🐛 Bug',
	feature_request: '💡 Feature request',
	other: '💬 Other',
}

// The Codex app (tldraw-internal/apps/public/codex-plugin) proxies our tools from a Cloudflare Worker,
// and Cloudflare stamps every Worker subrequest with `CF-Worker: <the Worker's zone>`. It runs on
// both of these zones while it moves to mcp.tldraw.com. A label for triage, not a security check: a
// direct caller could send the header itself.
const CODEX_APP_ZONES = new Set(['tldraw.xyz', 'tldraw.com'])

const COLORS: Record<FeedbackType, number> = {
	bug: 0xe5484d,
	feature_request: 0x3e63dd,
	other: 0x8b8d98,
}

// Header and client id are caller-controlled and unbounded; Discord refuses a field value over 1024.
const RAW_FIELD_MAX_LENGTH = 200

export async function sendMcpFeedback(
	env: Environment,
	input: FeedbackInput,
	sender: FeedbackSender
): Promise<SendFeedbackResult> {
	const payload = getFeedbackPayload(env, input, sender)
	const webhookUrl = env.DISCORD_MCP_FEEDBACK_WEBHOOK_URL
	if (!webhookUrl) {
		if (!env.IS_LOCAL) return { ok: false, reason: 'feedback_not_configured' }
		// eslint-disable-next-line no-console
		console.log('MCP feedback:', JSON.stringify(payload, null, 2))
		return { ok: true }
	}

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	if (!res.ok) {
		throw new Error(`Failed to send MCP feedback to Discord: ${res.status} ${await res.text()}`)
	}
	return { ok: true }
}

export function getFeedbackPayload(env: Environment, input: FeedbackInput, sender: FeedbackSender) {
	const fields = [
		{ name: 'Type', value: TYPE_LABELS[input.type], inline: true },
		{ name: 'Source', value: getFeedbackSource(sender.cfWorker), inline: true },
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

function getFeedbackSource(cfWorker: string | null) {
	if (!cfWorker) return 'dotcom MCP server'
	if (CODEX_APP_ZONES.has(cfWorker)) return 'Codex app'
	return `Proxied by a Worker on ${cfWorker}`
}

function codeValue(value: string | null) {
	if (!value) return 'None'
	const clipped =
		value.length > RAW_FIELD_MAX_LENGTH ? `${value.slice(0, RAW_FIELD_MAX_LENGTH)}…` : value
	// A backtick in the value would close the code span early.
	return `\`${clipped.replaceAll('`', "'")}\``
}
