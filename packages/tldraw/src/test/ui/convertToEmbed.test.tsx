import { act } from '@testing-library/react'
import { createShapeId, DefaultBorderStyle, TLBookmarkShape, TLEmbedShape } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

const EMBEDDABLE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

async function setup() {
	let actions: TLUiActionsContextType | null = null
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount}>
				<ActionCapturer onCapture={(a) => (actions = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)

	return { editor, convertToEmbed: actions!['convert-to-embed'] }
}

describe('convert-to-embed action', () => {
	it('carries the bookmark border across to the embed', async () => {
		const { editor, convertToEmbed } = await setup()

		const id = createShapeId()
		editor.createShapes<TLBookmarkShape>([
			{ id, type: 'bookmark', x: 0, y: 0, props: { url: EMBEDDABLE_URL, border: 'shadow' } },
		])
		editor.select(id)

		await act(async () => convertToEmbed.onSelect('context-menu'))

		const embed = editor.getCurrentPageShapes().find((s): s is TLEmbedShape => s.type === 'embed')!
		expect(embed.props.border).toBe('shadow')
	})

	it('does not fall back to the style for the next shape', async () => {
		const { editor, convertToEmbed } = await setup()

		// A bookmark keeps its own border, so the next-shape style must not win.
		editor.setStyleForNextShapes(DefaultBorderStyle, 'none')

		const id = createShapeId()
		editor.createShapes<TLBookmarkShape>([
			{ id, type: 'bookmark', x: 0, y: 0, props: { url: EMBEDDABLE_URL, border: 'lined' } },
		])
		editor.select(id)

		await act(async () => convertToEmbed.onSelect('context-menu'))

		const embed = editor.getCurrentPageShapes().find((s): s is TLEmbedShape => s.type === 'embed')!
		expect(embed.props.border).toBe('lined')
	})
})
