import { useSyncDemo } from '@tldraw/sync'
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

// The multiplayer twin of the "ghost nodes" example. It connects to tldraw's demo
// sync backend with `useSyncDemo`, so opening the same room URL in two browsers
// co-edits one document. The point: the ghost nodes never sync.
//
// - Ghost nodes live in a local `atom` (`ghostNodes$`), never in the synced store.
//   Generate them in one browser and they DON'T appear in the other — they're a
//   per-client overlay.
// - Accepting a ghost calls `editor.createShape`, a normal document record, so the
//   resulting shape DOES sync to everyone in the room.
// - They render through `OnTheCanvas`, so they scale + pan with the camera.

interface GhostNode {
	id: string
	x: number
	y: number
	w: number
	h: number
	label: string
}

// Local, per-client state — never written to the synced store.
const ghostNodes$ = atom<GhostNode[]>('ghostNodes', [])

const SUGGESTIONS = [
	'Onboarding flow',
	'Pricing page',
	'Empty state',
	'Settings screen',
	'Search results',
	'Error toast',
]

function suggestNodes(editor: Editor) {
	const bounds = editor.getViewportPageBounds()
	const w = 180
	const h = 110
	const gap = 32
	const count = 4
	const totalWidth = count * w + (count - 1) * gap
	const startX = bounds.midX - totalWidth / 2
	const y = bounds.midY - h / 2
	ghostNodes$.update((nodes) => [
		...nodes,
		...SUGGESTIONS.slice(0, count).map((label, i) => ({
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

// Accepting a ghost creates a real shape — which syncs to everyone in the room —
// and removes the local ghost.
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

function GhostCard({ node }: { node: GhostNode }) {
	const editor = useEditor()
	const [hovered, setHovered] = useState(false)

	return (
		<div
			onPointerEnter={() => setHovered(true)}
			onPointerLeave={() => setHovered(false)}
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
			<div style={{ fontSize: 11, opacity: 0.8 }}>Suggested by AI (local only)</div>
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
				{count} ghost{count === 1 ? '' : 's'} (local only — not synced)
			</span>
		</div>
	)
}

export default function GhostNodesMultiplayerExample({ roomId }: { roomId: string }) {
	const [editor, setEditor] = useState<Editor | null>(null)
	// Connects to tldraw's demo sync backend; the same roomId co-edits one document.
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				components={components}
				onMount={(ed) => {
					setEditor(ed)
					if (ghostNodes$.get().length === 0) suggestNodes(ed)
				}}
			/>
			{editor && <Toolbar editor={editor} />}
		</div>
	)
}
