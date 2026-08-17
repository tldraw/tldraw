import { useState } from 'react'
import {
	Box,
	Editor,
	StoreSnapshot,
	TLPageId,
	TLRecord,
	TLStoreSnapshot,
	Tldraw,
	TldrawImage,
	getSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'
import initialSnapshot from './snapshot.json'

// There's a guide at the bottom of this file!

export default function TldrawImageExample() {
	const [editor, setEditor] = useState<Editor>()
	const [snapshot, setSnapshot] = useState<StoreSnapshot<TLRecord>>(
		initialSnapshot as TLStoreSnapshot
	)
	const [currentPageId, setCurrentPageId] = useState<TLPageId | undefined>()
	const [showBackground, setShowBackground] = useState(true)
	const [isDarkMode, setIsDarkMode] = useState(false)
	const [viewportPageBounds, setViewportPageBounds] = useState(new Box(0, 0, 600, 400))
	const [isEditing, setIsEditing] = useState(false)
	const [format, setFormat] = useState<'svg' | 'png'>('svg')

	return (
		<div style={{ padding: 30 }}>
			<div>
				<button
					style={{ cursor: 'pointer', marginRight: 8 }}
					onClick={() => {
						if (isEditing) {
							if (!editor) return
							setIsDarkMode(editor.user.getIsDarkMode())
							setShowBackground(editor.getInstanceState().exportBackground)
							setViewportPageBounds(editor.getViewportPageBounds())
							setCurrentPageId(editor.getCurrentPageId())
							setSnapshot(getSnapshot(editor.store).document)
							setIsEditing(false)
						} else {
							setIsEditing(true)
						}
					}}
				>
					{isEditing ? '✓ Save drawing' : '✎ Edit drawing'}
				</button>
				{!isEditing && (
					<>
						<label htmlFor="format" style={{ marginRight: 8 }}>
							Format
						</label>
						<select
							name="format"
							value={format}
							onChange={(e) => {
								setFormat(e.currentTarget.value as 'svg' | 'png')
							}}
						>
							<option value="svg">SVG</option>
							<option value="png">PNG</option>
						</select>
					</>
				)}
			</div>
			<div style={{ width: 600, height: 400, marginTop: 15 }}>
				{isEditing ? (
					<Tldraw
						snapshot={snapshot}
						onMount={(editor: Editor) => {
							setEditor(editor)
							editor.user.updateUserPreferences({ colorScheme: isDarkMode ? 'dark' : 'light' })
							if (currentPageId) {
								editor.setCurrentPage(currentPageId)
							}
							if (viewportPageBounds) {
								editor.zoomToBounds(viewportPageBounds, { inset: 0 })
							}
						}}
					/>
				) : (
					<TldrawImage
						// [1]
						snapshot={snapshot}
						// [2]
						pageId={currentPageId}
						// [3]
						background={showBackground}
						darkMode={isDarkMode}
						bounds={viewportPageBounds}
						padding={0}
						scale={1}
						format={format}
					/>
				)}
			</div>
		</div>
	)
}

/*
[1]
Pass a `TLStoreSnapshot` to the `snapshot` prop. When the user saves, we grab a fresh
one from the editor with `getSnapshot(editor.store).document`.

[2]
`pageId` picks which page to render. It defaults to the first page, which is why we
capture the editor's current page when leaving edit mode.

[3]
The remaining props control appearance: `background` and `darkMode` match what the
user was looking at, `bounds` renders just the region that was in the viewport, and
`format` chooses between SVG and PNG output.
*/
