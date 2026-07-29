// oxlint-disable typescript/no-deprecated -- one case covers the deprecated canvas cursor overlay
import { act } from '@testing-library/react'
import { Editor, TLAnyOverlayUtilConstructor, TldrawEditor } from '@tldraw/editor'
import { createUserId, InstancePresenceRecordType } from '@tldraw/tlschema'
import { defaultOverlayUtils } from '../lib/defaultOverlayUtils'
import { defaultTools } from '../lib/defaultTools'
import { CollaboratorCursorOverlayUtil } from '../lib/overlays/CollaboratorCursorOverlayUtil'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

function putCollaborator(editor: Editor) {
	act(() => {
		editor.store.put([
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('peer1'),
				userId: createUserId('peer1'),
				userName: 'Alice',
				currentPageId: editor.getCurrentPageId(),
				cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
				lastActivityTimestamp: Date.now(),
			}),
		])
	})
}

async function renderWithOverlayUtils(overlayUtils: readonly TLAnyOverlayUtilConstructor[]) {
	return await renderTldrawComponentWithEditor(
		(onMount) => (
			<TldrawEditor
				tools={defaultTools}
				initialState="select"
				overlayUtils={overlayUtils}
				onMount={onMount}
				autoFocus={false}
			/>
		),
		{ waitForPatterns: false }
	)
}

describe('<LiveCollaborators />', () => {
	it('renders a DOM cursor layer for visible collaborators', async () => {
		const { editor, rendered } = await renderWithOverlayUtils(defaultOverlayUtils)
		putCollaborator(editor)
		expect(rendered.container.querySelector('.tl-collaborators')).not.toBe(null)
	})

	it('stands down when the deprecated canvas cursor overlay util is registered', async () => {
		const { editor, rendered } = await renderWithOverlayUtils([
			...defaultOverlayUtils,
			CollaboratorCursorOverlayUtil,
		])
		putCollaborator(editor)
		expect(rendered.container.querySelector('.tl-collaborators')).toBe(null)
	})
})
