import { exhaustiveSwitchError } from '@tldraw/utils'
import { type APIEmbed } from 'discord-api-types/v10'
import { Event as UpdownEvent } from './updown_types'

// discord wants decimal colours
const GREEN = 4243543
const RED = 14692657
const ORANGE = 16213767

// docs: https://birdie0.github.io/discord-webhooks-guide/index.html
export interface DiscordPayload {
	username: string
	content: string
	embeds: APIEmbed[]
}

function formatUpdownEvent(event: UpdownEvent): {
	colour: number
	title: string
	description: string
} | null {
	switch (event.event) {
		case 'check.down':
			return {
				colour: RED,
				title: `Check DOWN at <${event.check.url}>`,
				description: `<${event.check.url}> is down: "${event.downtime.error}"\n\nNext check in ${event.check.period} seconds`,
			}
		case 'check.still_down':
			return null
		case 'check.up': {
			return {
				colour: GREEN,
				title: `Check UP at <${event.check.url}>`,
				description: `<${event.check.url}> is up\n\nIt was down for ${event.downtime.duration} seconds`,
			}
		}
		case 'check.ssl_invalid': {
			return {
				colour: RED,
				title: `SSL INVALID at <${event.check.url}>`,
				description: `SSL certificate at <${event.check.url}> is invalid: "${event.ssl.error}"`,
			}
		}
		case 'check.ssl_valid': {
			return {
				colour: GREEN,
				title: `SSL VALID at <${event.check.url}>`,
				description: `SSL certificate at <${event.check.url}> is now valid`,
			}
		}
		case 'check.ssl_expiration': {
			return {
				colour: ORANGE,
				title: `SSL EXPIRATION at <${event.check.url}>`,
				description: `SSL certificate at <${event.check.url}> will expire in ${event.ssl.days_before_expiration} days`,
			}
		}

		case 'check.ssl_renewed': {
			return {
				colour: GREEN,
				title: `SSL RENEWED at <${event.check.url}>`,
				description: `SSL certificate at <${event.check.url}> was renewed`,
			}
		}
		case 'check.performance_drop':
			return {
				colour: ORANGE,
				title: `PERFORMANCE DROP at <${event.check.url}>`,
				description: `Performance drop at <${event.check.url}>, apdex dropped ${event.apdex_dropped}`,
			}

		default:
			exhaustiveSwitchError(event, 'event')
	}
}

export function updownToDiscord(event: UpdownEvent): DiscordPayload | null {
	const formatted = formatUpdownEvent(event)
	if (!formatted) return null

	const { colour, title, description } = formatted

	return {
		username: 'Health Worker',
		content: `Updown: ${title}`,
		embeds: [
			{
				color: colour,
				description: description,
				timestamp: event.time,
			},
		],
	}
}
