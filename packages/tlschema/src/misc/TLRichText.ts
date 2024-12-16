import { T } from '@tldraw/validate'

/** @public */
export const richTextValidator = T.object({ type: T.string, content: T.arrayOf(T.unknown) })

/** @public */
export type TLRichText = T.TypeOf<typeof richTextValidator>

/** @public */
export function convertTextToTipTapDocument(text: string): TLRichText {
	const lines = text.split('\n')
	const content = lines.map((line) => {
		const sanitizedLine = line
			.replace(/\x20/g, '\u00A0')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
		if (!sanitizedLine) {
			return {
				type: 'paragraph',
			}
		}

		return {
			type: 'paragraph',
			content: [{ type: 'text', text: sanitizedLine }],
		}
	})

	return {
		type: 'doc',
		content,
	}
}
