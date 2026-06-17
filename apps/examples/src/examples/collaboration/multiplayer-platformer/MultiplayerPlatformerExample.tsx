import { useSyncDemo } from '@tldraw/sync'
import { useEffect, useRef } from 'react'
import { Box, Editor, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { type Collider, type PlayerMotion, stepPlayer } from './physics'
import './multiplayer-platformer.css'
import { PLAYER_TYPE, PlayerShape, PlayerShapeUtil } from './PlayerShape'

// [1]
const customShapeUtils = [PlayerShapeUtil]

// [2]
interface Terrain {
	x: number
	y: number
	w: number
	h: number
	color: 'grey' | 'blue' | 'orange' | 'green'
}

const LEVEL: Terrain[] = [
	{ x: -200, y: 560, w: 2000, h: 160, color: 'grey' }, // floor
	{ x: 60, y: 500, w: 140, h: 60, color: 'grey' }, // step by the spawn
	{ x: 280, y: 430, w: 220, h: 30, color: 'blue' },
	{ x: 600, y: 320, w: 200, h: 30, color: 'blue' },
	{ x: 760, y: 180, w: 120, h: 120, color: 'orange' }, // floating crate
	{ x: 960, y: 410, w: 200, h: 30, color: 'blue' },
	{ x: 1220, y: 360, w: 70, h: 200, color: 'grey' }, // pillar
	{ x: 1360, y: 470, w: 220, h: 30, color: 'green' },
]

const SPAWN = { x: 90, y: 120 }
// Anything that falls below this has left the level — send it back to the spawn.
const VOID_Y = 1300
const LEVEL_VIEW = new Box(-60, 100, 1380, 640)
// How long an owner can be missing from presence before we remove their player.
// The grace period rides out brief disconnects and the moment right after
// joining, before peer presence has finished syncing.
const DESPAWN_GRACE_MS = 3000

// [3]
function getMyPlayer(editor: Editor): PlayerShape | undefined {
	const ownerId = editor.user.getRecordId()
	return editor
		.getCurrentPageShapes()
		.find((s): s is PlayerShape => s.type === PLAYER_TYPE && s.props.ownerId === ownerId)
}

// [4]
function setupLevel(editor: Editor) {
	if (editor.getCurrentPageShapes().length === 0) {
		editor.createShapes(
			LEVEL.map((t) => ({
				type: 'geo' as const,
				x: t.x,
				y: t.y,
				props: {
					geo: 'rectangle' as const,
					w: t.w,
					h: t.h,
					color: t.color,
					fill: 'solid' as const,
				},
			}))
		)
	}

	if (!getMyPlayer(editor)) {
		// Offset each new arrival so players don't spawn directly on top of one another.
		const playerCount = editor.getCurrentPageShapes().filter((s) => s.type === PLAYER_TYPE).length
		editor.createShape<PlayerShape>({
			type: PLAYER_TYPE,
			x: SPAWN.x + playerCount * 60,
			y: SPAWN.y,
			props: {
				ownerId: editor.user.getRecordId(),
				name: editor.user.getName(),
				color: editor.user.getColor(),
			},
		})
	}

	editor.zoomToBounds(LEVEL_VIEW, { inset: 32, immediate: true })
}

// [5]
const LEFT_KEYS = new Set(['arrowleft', 'a'])
const RIGHT_KEYS = new Set(['arrowright', 'd'])
const JUMP_KEYS = new Set(['arrowup', 'w', ' ', 'spacebar'])

function isGameKey(key: string) {
	return LEFT_KEYS.has(key) || RIGHT_KEYS.has(key) || JUMP_KEYS.has(key)
}

// [6]
function PlatformerEngine() {
	const editor = useEditor()
	const pressed = useRef(new Set<string>())
	const jumpRequested = useRef(false)
	const motion = useRef<PlayerMotion>({ vx: 0, vy: 0, grounded: false })

	useEffect(() => {
		setupLevel(editor)

		// [7]
		// Remove the player of any collaborator who has left the room. We seed
		// everyone who already has a player as "present" so that, just after we
		// join, their players survive until peer presence has synced.
		const lastSeenPresent = new Map<string, number>()
		const joinedAt = Date.now()
		for (const shape of editor.getCurrentPageShapes()) {
			if (shape.type === PLAYER_TYPE) lastSeenPresent.set(shape.props.ownerId, joinedAt)
		}
		const reconcilePlayers = () => {
			const now = Date.now()
			// getCollaborators() is the set of connected peers (presence records), not
			// the activity-filtered set — so a player standing still isn't treated as
			// gone. Our own id is always present.
			const present = new Set<string>(editor.getCollaborators().map((c) => c.userId))
			present.add(editor.user.getRecordId())
			for (const id of present) lastSeenPresent.set(id, now)
			const departed = editor
				.getCurrentPageShapes()
				.filter(
					(s) =>
						s.type === PLAYER_TYPE &&
						!present.has(s.props.ownerId) &&
						now - (lastSeenPresent.get(s.props.ownerId) ?? now) > DESPAWN_GRACE_MS
				)
			if (departed.length === 0) return
			editor.run(() => editor.deleteShapes(departed.map((s) => s.id)), { history: 'ignore' })
		}
		const despawnInterval = window.setInterval(reconcilePlayers, 1000)

		// [8]
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			if (editor.getEditingShapeId()) return
			const target = e.target as HTMLElement | null
			if (
				target?.isContentEditable ||
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA'
			) {
				return
			}
			const key = e.key.toLowerCase()
			if (!isGameKey(key)) return

			// Claim these keys for the game. We listen in the capture phase, which
			// runs before tldraw's own handlers, and stop propagation so the editor
			// never sees them — otherwise space would pan, the arrows would nudge the
			// selection, and W/A/S/D would switch tools. preventDefault stops the page
			// from scrolling. Every other key still reaches the editor, so undo,
			// copy/paste, and the rest keep working.
			e.preventDefault()
			e.stopPropagation()

			if (JUMP_KEYS.has(key)) {
				// One press, one jump (ignore auto-repeat) — it fires next tick if we're
				// on the ground, otherwise it's ignored.
				if (!e.repeat) jumpRequested.current = true
			} else {
				pressed.current.add(key)
			}
		}

		const onKeyUp = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase()
			if (!isGameKey(key)) return
			e.stopPropagation()
			pressed.current.delete(key)
		}

		// Don't get stuck running when the tab loses focus mid-stride.
		const onBlur = () => {
			pressed.current.clear()
			jumpRequested.current = false
		}

		// [9]
		const onTick = (elapsedMs: number) => {
			const me = getMyPlayer(editor)
			if (!me) return

			// While I'm actively manipulating my own player — dragging, resizing, or
			// rotating it — pause physics so gravity doesn't fight the pointer. It
			// resumes from rest once the interaction finishes.
			const manipulatingMe =
				editor.getSelectedShapeIds().includes(me.id) &&
				(editor.isIn('select.translating') ||
					editor.isIn('select.resizing') ||
					editor.isIn('select.rotating'))
			if (manipulatingMe) {
				motion.current = { vx: 0, vy: 0, grounded: motion.current.grounded }
				return
			}

			// Clamp dt so a backgrounded tab doesn't teleport the player on resume.
			const dt = Math.min(elapsedMs, 50) / 1000

			// [10]
			const colliders: Collider[] = []
			for (const shape of editor.getCurrentPageShapes()) {
				if (shape.id === me.id) continue
				const geometry = editor.getShapeGeometry(shape)
				// Open shapes (lines, arrows) have no interior to stand on — skip them.
				if (!geometry.isClosed) continue
				const transform = editor.getShapePageTransform(shape)
				const vertices = geometry.vertices.map((v) => {
					const page = transform.applyToPoint(v)
					return { x: page.x, y: page.y }
				})
				if (vertices.length >= 3) colliders.push({ vertices })
			}

			const left = [...pressed.current].some((k) => LEFT_KEYS.has(k))
			const right = [...pressed.current].some((k) => RIGHT_KEYS.has(k))
			const input = { left, right, jump: jumpRequested.current }
			jumpRequested.current = false

			// The player is its own rotated outline, so its hitbox matches what you
			// see even after you spin the character around.
			const playerTransform = editor.getShapePageTransform(me)
			const playerVertices = editor.getShapeGeometry(me).vertices.map((v) => {
				const page = playerTransform.applyToPoint(v)
				return { x: page.x, y: page.y }
			})

			const result = stepPlayer(playerVertices, motion.current, input, colliders, dt)
			motion.current = { vx: result.vx, vy: result.vy, grounded: result.grounded }

			let x = me.x + result.dx
			let y = me.y + result.dy
			if (y > VOID_Y) {
				x = SPAWN.x
				y = SPAWN.y
				motion.current = { vx: 0, vy: 0, grounded: false }
			}

			const facing = result.facing ?? me.props.facing
			const moved = Math.abs(x - me.x) > 0.01 || Math.abs(y - me.y) > 0.01
			const turned = facing !== me.props.facing
			if (!moved && !turned) return

			// [11]
			editor.run(
				() => {
					editor.updateShape<PlayerShape>({
						id: me.id,
						type: PLAYER_TYPE,
						x,
						y,
						props: turned ? { facing } : undefined,
					})
				},
				{ history: 'ignore' }
			)
		}

		window.addEventListener('keydown', onKeyDown, { capture: true })
		window.addEventListener('keyup', onKeyUp, { capture: true })
		window.addEventListener('blur', onBlur)
		editor.on('tick', onTick)

		return () => {
			window.clearInterval(despawnInterval)
			window.removeEventListener('keydown', onKeyDown, { capture: true })
			window.removeEventListener('keyup', onKeyUp, { capture: true })
			window.removeEventListener('blur', onBlur)
			editor.off('tick', onTick)
		}
	}, [editor])

	return null
}

// [12]
function Hud() {
	const editor = useEditor()
	const respawn = () => {
		const me = getMyPlayer(editor)
		if (!me) return
		editor.run(
			() =>
				editor.updateShape<PlayerShape>({ id: me.id, type: PLAYER_TYPE, x: SPAWN.x, y: SPAWN.y }),
			{ history: 'ignore' }
		)
	}
	return (
		<div className="platformer-hud">
			<strong className="platformer-hud__title">Multiplayer platformer</strong>
			<span>
				<kbd>A</kbd>
				<kbd>D</kbd> / <kbd>←</kbd>
				<kbd>→</kbd> move · <kbd>space</kbd> jump
			</span>
			<span className="platformer-hud__hint">
				Everything is just a shape — drag the ground, blocks, and players to rebuild the level.
			</span>
			<TldrawUiButton type="normal" onClick={respawn}>
				Respawn
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: Hud,
}

export default function MultiplayerPlatformerExample({ roomId }: { roomId: string }) {
	// [13]
	const store = useSyncDemo({ roomId, shapeUtils: customShapeUtils })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} shapeUtils={customShapeUtils} components={components}>
				<PlatformerEngine />
			</Tldraw>
		</div>
	)
}

/*
This example turns the canvas into a shared 2D platformer. Every collaborator
gets a player they drive with the keyboard, but the level itself — floor,
platforms, crates, and the players — is made of ordinary tldraw shapes that
anyone can still select, drag, resize, and delete.

[1]
Our custom player shape util. We pass it to both `useSyncDemo` and `<Tldraw>` so
the synced store and the editor agree on how to validate and render the shape.

[2]
The level is a plain list of rectangles. We turn them into normal `geo` shapes,
so there's nothing special about them — they're just the things the player
collides with.

[3]
Find the player belonging to the current user. Each player shape is tagged with
its owner's id, and we only ever simulate our own.

[4]
On mount we build the level if the room is empty (the first visitor lays it out;
everyone else receives it over sync) and add our own player if we don't already
have one. Using the user's id as the owner means reloading reuses the same
player rather than spawning duplicates.

[5]
Key sets for the two control schemes: WASD and the arrow keys, plus space to
jump.

[6]
The engine. It owns the keyboard state and the per-frame simulation. It renders
nothing — it just reads input and writes the player's position back to the
store.

[7]
When a collaborator leaves, their player should go too. `getCollaborators()`
gives us the connected peers (it tracks presence records, not activity, so an
idle player isn't mistaken for an absent one); any player whose owner isn't in
that set — plus our own id — has left. We poll on an interval rather than react
instantly so a brief disconnect, or the gap between joining and presence
syncing, doesn't delete a player that's about to reappear (the grace period).

[8]
We listen for keys on the window in the capture phase, which runs before
tldraw's own handlers, and call `stopPropagation` on the game keys so the editor
never sees them. That's how we stop space from panning, the arrow keys from
nudging the selection, and W/A/S/D from switching tools, without disabling those
shortcuts elsewhere. Typing into a shape's text or an input is left alone.

[9]
The game loop runs on the editor's `tick` event. We only simulate our own
player; everyone else's positions arrive over sync. While we're dragging,
resizing, or rotating our own player we pause physics so the interaction wins.

[10]
Each collider is a shape's real outline — its geometry vertices mapped into page
space via the shape's transform — not its bounding box. So a rotated rectangle
collides as a rotated rectangle, and the player can land on a tilted shape and
slide down it. The player is passed through the same path (its own rotated
outline), so its hitbox matches what you see even after you rotate the character.
We skip open shapes (lines, arrows) since they have no interior to stand on.
Collision is solved with SAT in `physics.ts`: exact for convex shapes
(rectangles, triangles), approximate for the many-sided polygons used for
ellipses, and rough for concave shapes.

[11]
Position updates run with `history: 'ignore'` so the physics don't fill up the
undo stack. A resting player settles to the same spot every frame, so it stops
emitting updates (and sync traffic) once it's standing still.

[12]
A small heads-up display with the controls and a respawn button.

[13]
`useSyncDemo` connects to tldraw's hosted demo sync server. It's only for
prototyping — rooms are wiped after a day.
*/
