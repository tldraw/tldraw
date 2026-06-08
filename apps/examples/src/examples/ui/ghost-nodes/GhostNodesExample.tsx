import { useState } from 'react'
import {
	atom,
	Editor,
	TLEditorComponents,
	Tldraw,
	toRichText,
	uniqueId,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// "Ghost nodes" — AI suggestions rendered on the canvas. They show as faint cards
// that you can accept (materialise into a real shape) or dismiss.
//
// The important bits:
// - They live in a plain local atom (`ghostNodes$`), NOT in the editor's document
//   store. So they never sync to collaborators and never persist — they're a
//   per-client overlay. Accepting one creates a real shape, which DOES sync.
// - They're rendered through the `OnTheCanvas` component slot, so they sit in page
//   space and scale + pan with the camera exactly like shapes, with no manual
//   coordinate math.

interface GhostNode {
	id: string
	x: number
	y: number
	w: number
	h: number
	label: string
}

// Local, per-client state. Nothing here is written to `editor.store`, so it is
// invisible to other users and to other tabs of the same document.
const ghostNodes$ = atom<GhostNode[]>('ghostNodes', [])

const SUGGESTIONS = [
	'Onboarding flow',
	'Pricing page',
	'Empty state',
	'Settings screen',
	'Search results',
	'Error toast',
]

// Add a batch of suggestions, laid out in a row across the current viewport so
// they're always on screen regardless of zoom/pan.
function suggestNodes(editor: Editor) {
	const bounds = editor.getViewportPageBounds()
	const w = 180
	const h = 110
	const gap = 32
	const count = 4
	const totalWidth = count * w + (count - 1) * gap
	const startX = bounds.midX - totalWidth / 2
	const y = bounds.midY - h / 2
	const labels = [...SUGGESTIONS].slice(0, count)
	ghostNodes$.update((nodes) => [
		...nodes,
		...labels.map((label, i) => ({
			id: uniqueId(),
			x: startX + i * (w + gap),
			y,
			w,
			h,
			label,
		})),
	])
}

function dismissNode(id: string) {
	ghostNodes$.update((nodes) => nodes.filter((n) => n.id !== id))
}

// Accepting a ghost turns it into a real (synced, persisted) shape and removes the
// ghost. This is the local-overlay → document hand-off.
function acceptNode(editor: Editor, node: GhostNode) {
	editor.createShape({
		type: 'geo',
		x: node.x,
		y: node.y,
		props: {
			geo: 'rectangle',
			w: node.w,
			h: node.h,
			richText: toRichText(node.label),
			color: 'violet',
		},
	})
	dismissNode(node.id)
}

// One ghost card. Positioned in PAGE coordinates — the OnTheCanvas layer applies
// the camera transform, so this scales and pans with the canvas like a shape.
function GhostCard({ node }: { node: GhostNode }) {
	const editor = useEditor()
	const [hovered, setHovered] = useState(false)

	return (
		<div
			onPointerEnter={() => setHovered(true)}
			onPointerLeave={() => setHovered(false)}
			// Keep canvas interactions from firing underneath the card.
			onPointerDown={editor.markEventAsHandled}
			style={{
				position: 'absolute',
				left: node.x,
				top: node.y,
				width: node.w,
				height: node.h,
				boxSizing: 'border-box',
				padding: 12,
				borderRadius: 10,
				border: '2px dashed #8b5cf6',
				background: 'rgba(139, 92, 246, 0.08)',
				color: '#5b21b6',
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				pointerEvents: 'all',
				opacity: hovered ? 1 : 0.35,
				transition: 'opacity 0.12s ease',
			}}
		>
			<div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>✨ {node.label}</div>
			<div style={{ fontSize: 11, opacity: 0.8 }}>Suggested by AI</div>
			<div style={{ flex: 1 }} />
			{hovered && (
				<div style={{ display: 'flex', gap: 6 }}>
					<button style={addButtonStyle} onClick={() => acceptNode(editor, node)}>
						Add
					</button>
					<button style={dismissButtonStyle} onClick={() => dismissNode(node.id)}>
						Dismiss
					</button>
				</div>
			)}
		</div>
	)
}

const addButtonStyle: React.CSSProperties = {
	flex: 1,
	border: 'none',
	borderRadius: 6,
	padding: '4px 0',
	background: '#8b5cf6',
	color: 'white',
	fontSize: 12,
	fontWeight: 600,
	cursor: 'pointer',
}
const dismissButtonStyle: React.CSSProperties = {
	flex: 1,
	border: '1px solid #c4b5fd',
	borderRadius: 6,
	padding: '4px 0',
	background: 'transparent',
	color: '#7c3aed',
	fontSize: 12,
	cursor: 'pointer',
}

// The OnTheCanvas layer: render a card per ghost node.
function GhostNodesLayer() {
	const nodes = useValue('ghost-nodes', () => ghostNodes$.get(), [])
	return (
		<>
			{nodes.map((node) => (
				<GhostCard key={node.id} node={node} />
			))}
		</>
	)
}

const components: TLEditorComponents = {
	OnTheCanvas: GhostNodesLayer,
}

// A fixed, screen-space toolbar (rendered outside the camera). It gets the editor
// from onMount so it can read the viewport and add suggestions.
function Toolbar({ editor }: { editor: Editor }) {
	const count = useValue('ghost-count', () => ghostNodes$.get().length, [])
	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 300,
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				pointerEvents: 'all',
			}}
		>
			<button onClick={() => suggestNodes(editor)}>✨ Suggest nodes</button>
			<button onClick={() => ghostNodes$.set([])} disabled={count === 0}>
				Clear suggestions
			</button>
			<span style={{ fontSize: 12, color: '#666' }}>
				{count} ghost{count === 1 ? '' : 's'} (local only)
			</span>
		</div>
	)
}

export default function GhostNodesExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="ghost-nodes-example"
				components={components}
				onMount={(ed) => {
					setEditor(ed)
					// Seed a few suggestions so the canvas isn't empty on load.
					if (ghostNodes$.get().length === 0) suggestNodes(ed)
				}}
			/>
			{editor && <Toolbar editor={editor} />}
		</div>
	)
}
