import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import {
	localizeWelcomeSnapshot,
	WELCOME_COPY,
	WelcomeCopyEntry,
	WelcomePart,
} from './localizeWelcomeSnapshot'

function baseSnapshot() {
	return JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
}

function shape(snapshot: RoomSnapshot, id: string) {
	return snapshot.documents.find((d) => (d.state as { id?: string }).id === id)?.state as {
		props?: { richText?: { content?: any[] } }
	}
}

/** Flatten a tiptap richText doc to "<text>" with bold runs wrapped in *…* for assertions. */
function readText(richText: { content?: any[] } | undefined): string {
	const out: string[] = []
	const walk = (node: any) => {
		if (node?.type === 'text') {
			const bold = node.marks?.some((m: any) => m.type === 'bold')
			out.push(bold ? `*${node.text}*` : node.text)
		}
		node?.content?.forEach(walk)
	}
	richText?.content?.forEach(walk)
	return out.join('')
}

// react-intl is the real client adapter; the tests use plain stand-ins so the injector can be
// exercised without pulling intl into the worker.
const english = (entry: WelcomeCopyEntry): WelcomePart[] => parseStrong(entry.defaultMessage)
const pseudo = (entry: WelcomeCopyEntry): WelcomePart[] =>
	parseStrong(entry.defaultMessage).map((p) =>
		typeof p === 'string' ? `«${p}»` : { bold: `«${p.bold}»` }
	)

/** Minimal `<strong>` splitter mirroring what react-intl's chunk handler would produce. */
function parseStrong(message: string): WelcomePart[] {
	return message
		.split(/<strong>(.*?)<\/strong>/g)
		.map((chunk, i) => (i % 2 === 1 ? { bold: chunk } : chunk))
		.filter((p) => (typeof p === 'string' ? p.length > 0 : true))
}

describe('localizeWelcomeSnapshot', () => {
	it('rewrites the instructional copy and preserves bold runs', () => {
		const localized = localizeWelcomeSnapshot(baseSnapshot(), pseudo)

		expect(readText(shape(localized, 'shape:welcome-title').props?.richText)).toBe(
			'«Welcome to your workspace»'
		)
		// caption-1 keeps its bold "shared space" run through translation.
		expect(readText(shape(localized, 'shape:welcome-caption-1').props?.richText)).toBe(
			'«A workspace is a »*«shared space»*« for your team. Everyone in it can see and edit its files.»'
		)
	})

	it('leaves the hand-drawn art and in-world flavor text byte-identical', () => {
		const before = baseSnapshot()
		const after = localizeWelcomeSnapshot(before, pseudo)

		const mapped = new Set(Object.keys(WELCOME_COPY))
		for (const doc of before.documents) {
			const id = (doc.state as { id?: string }).id
			if (id && mapped.has(id)) continue
			const other = after.documents.find((d) => (d.state as { id?: string }).id === id)
			// every non-instructional record (draw art, geo bubbles, flavor labels, camera, page…)
			// is untouched.
			expect(other).toEqual(doc)
		}
	})

	it('round-trips to the original copy under an identity (English) formatter', () => {
		const localized = localizeWelcomeSnapshot(baseSnapshot(), english)
		expect(readText(shape(localized, 'shape:welcome-caption-1').props?.richText)).toBe(
			'A workspace is a *shared space* for your team. Everyone in it can see and edit its files.'
		)
	})
})
