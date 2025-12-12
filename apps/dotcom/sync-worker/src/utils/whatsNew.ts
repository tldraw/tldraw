import type { WhatsNewEntry } from '@tldraw/dotcom-shared'
import type { Environment } from '../types'

const ENTRIES_KEY = 'whats-new:entries'
const MAX_ENTRIES = 5

async function getAllEntries(env: Environment): Promise<WhatsNewEntry[]> {
	const data = await env.WHATS_NEW.get(ENTRIES_KEY)
	if (!data) {
		return []
	}
	return JSON.parse(data)
}

export async function getWhatsNewEntries(env: Environment): Promise<WhatsNewEntry[]> {
	const entries = await getAllEntries(env)
	return entries.slice(0, MAX_ENTRIES)
}

export async function setWhatsNewEntry(env: Environment, entry: WhatsNewEntry): Promise<void> {
	const entries = await getAllEntries(env)
	const existingIndex = entries.findIndex((e) => e.version === entry.version)

	if (existingIndex >= 0) {
		entries[existingIndex] = entry
	} else {
		entries.push(entry)
	}

	entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

	await env.WHATS_NEW.put(ENTRIES_KEY, JSON.stringify(entries))
}

export async function deleteWhatsNewEntry(env: Environment, version: string): Promise<void> {
	const entries = await getAllEntries(env)
	const filtered = entries.filter((e) => e.version !== version)

	await env.WHATS_NEW.put(ENTRIES_KEY, JSON.stringify(filtered))
}
