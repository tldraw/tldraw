import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { generateText, ModelMessage, UserContent } from 'ai'
import { SYSTEM_PROMPT, USER_PROMPT, USER_PROMPT_WITH_PREVIOUS_DESIGN } from '@/lib/prompt'

export const maxDuration = 60

export type MakeRealProvider = 'openai' | 'anthropic' | 'google'

export interface MakeRealRequest {
	image: string
	text?: string
	theme?: 'light' | 'dark'
	previousPreviews?: { html: string }[]
	provider?: MakeRealProvider
}

const DEFAULT_MODELS: Record<MakeRealProvider, string> = {
	openai: 'gpt-4o',
	anthropic: 'claude-sonnet-4-6',
	google: 'gemini-2.5-pro',
}

function selectModel(provider: MakeRealProvider) {
	switch (provider) {
		case 'anthropic':
			return anthropic(DEFAULT_MODELS.anthropic)
		case 'google':
			return google(DEFAULT_MODELS.google)
		case 'openai':
		default:
			return openai(DEFAULT_MODELS.openai)
	}
}

export async function POST(req: Request) {
	let body: MakeRealRequest
	try {
		body = (await req.json()) as MakeRealRequest
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const { image, text = '', theme = 'light', previousPreviews = [], provider = 'openai' } = body

	if (!image) {
		return new Response(JSON.stringify({ error: 'Missing image data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const userParts: Exclude<UserContent, string> = []

	userParts.push({
		type: 'text',
		text: previousPreviews.length > 0 ? USER_PROMPT_WITH_PREVIOUS_DESIGN : USER_PROMPT,
	})

	userParts.push({
		type: 'image',
		image,
	})

	if (text) {
		userParts.push({
			type: 'text',
			text: `Here's a list of text that we found in the design:\n${text}`,
		})
	}

	for (const preview of previousPreviews) {
		userParts.push({
			type: 'text',
			text: `The designs also included one of your previous results. Here's the HTML you came up with for it: ${preview.html}`,
		})
	}

	userParts.push({
		type: 'text',
		text: `Please make your result use the ${theme} theme.`,
	})

	const messages: ModelMessage[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: userParts },
	]

	try {
		const result = await generateText({
			model: selectModel(provider),
			messages,
			temperature: 0,
		})

		const message = result.text
		const start = message.indexOf('<!DOCTYPE html>')
		const end = message.indexOf('</html>')
		const html = start === -1 || end === -1 ? '' : message.slice(start, end + '</html>'.length)

		if (html.length < 100) {
			return new Response(
				JSON.stringify({
					error: 'Could not generate a design from those wireframes.',
					raw: message,
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		}

		return new Response(JSON.stringify({ html }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error'
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}
