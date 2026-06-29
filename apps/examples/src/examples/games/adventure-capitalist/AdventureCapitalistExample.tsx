import {
	createShapeId,
	Editor,
	TLComponents,
	TLDefaultColorStyle,
	TLEventInfo,
	TLShapeId,
	Tldraw,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1] An "AdVenture Capitalist"-style idle game built entirely from tldraw's
// built-in `geo` and `text` shapes. There are no custom shapes: the shapes are
// just the rendering layer, and all of the game state + animation lives in
// plain JavaScript that pokes the editor through its public API.

interface Business {
	key: string
	name: string
	emoji: string
	color: TLDefaultColorStyle
	baseCost: number
	costRate: number // cost grows by this factor for every unit owned
	revenue: number // earned per completed cycle, per unit owned
	cycleMs: number
	managerCost: number
	// mutable runtime state:
	count: number
	progress: number // 0..1 through the current cycle
	running: boolean
	manager: boolean // hired managers auto-restart the cycle
}

// The game state is the list of businesses plus a shared money balance.
type Game = Business[] & { money: number }

// [2] The roster. Costs and revenues follow the genre's classic exponential
// curve: each business is roughly an order of magnitude pricier than the last.
function makeBusinesses(): Business[] {
	return [
		{ key: 'lemonade', name: 'Lemonade stand', emoji: '🍋', color: 'yellow', baseCost: 4, costRate: 1.07, revenue: 1, cycleMs: 1000, managerCost: 100, count: 1, progress: 0, running: false, manager: false }, // prettier-ignore
		{ key: 'news', name: 'Newspaper route', emoji: '📰', color: 'blue', baseCost: 60, costRate: 1.15, revenue: 60, cycleMs: 3000, managerCost: 1500, count: 0, progress: 0, running: false, manager: false }, // prettier-ignore
		{ key: 'carwash', name: 'Car wash', emoji: '🚗', color: 'light-blue', baseCost: 720, costRate: 1.14, revenue: 540, cycleMs: 6000, managerCost: 20000, count: 0, progress: 0, running: false, manager: false }, // prettier-ignore
		{ key: 'pizza', name: 'Pizza shop', emoji: '🍕', color: 'red', baseCost: 8640, costRate: 1.13, revenue: 4320, cycleMs: 12000, managerCost: 250000, count: 0, progress: 0, running: false, manager: false }, // prettier-ignore
	]
}

// [3] Layout constants. The board is a vertical stack of business rows.
const ROW_TOP = 140
const ROW_H = 130
const TRACK_X = 230
const TRACK_W = 320
const TRACK_H = 28

const id = (s: string) => createShapeId(`ac-${s}`)

function nextCost(b: Business) {
	return Math.ceil(b.baseCost * Math.pow(b.costRate, b.count))
}

function formatMoney(n: number) {
	if (n < 1000) return '$' + Math.floor(n)
	const units = ['k', 'M', 'B', 'T', 'q', 'Q']
	let u = -1
	let v = n
	while (v >= 1000 && u < units.length - 1) {
		v /= 1000
		u++
	}
	return '$' + v.toFixed(2) + units[u]
}

// [4] Build the board once and return the click-action lookup. Every clickable
// shape id maps to the function that should run when it's tapped.
function buildBoard(editor: Editor, game: Game) {
	const actions = new Map<TLShapeId, () => void>()

	const titleId = id('title')
	const moneyId = id('money')

	editor.createShapes([
		{ id: titleId, type: 'text', x: 40, y: 24, props: { richText: toRichText('AdVenture Capitalist'), size: 'm', color: 'black' } },
		{ id: moneyId, type: 'text', x: 40, y: 64, props: { richText: toRichText('$0'), size: 'xl', color: 'green' } },
	]) // prettier-ignore

	game.forEach((b, i) => {
		const y = ROW_TOP + i * ROW_H
		const produceId = id(`${b.key}-produce`)
		const trackId = id(`${b.key}-track`)
		const fillId = id(`${b.key}-fill`)
		const buyId = id(`${b.key}-buy`)
		const mgrId = id(`${b.key}-mgr`)

		editor.createShapes([
			// Click this to run a production cycle.
			{ id: produceId, type: 'geo', x: 40, y, props: { geo: 'rectangle', w: 170, h: 96, color: b.color, fill: 'semi', size: 's', richText: toRichText(`${b.emoji} ${b.name}`), verticalAlign: 'middle' } },
			// Progress bar: a static track with a fill rectangle on top.
			{ id: trackId, type: 'geo', x: TRACK_X, y: y + 34, props: { geo: 'rectangle', w: TRACK_W, h: TRACK_H, color: 'grey', fill: 'semi', size: 's' } },
			{ id: fillId, type: 'geo', x: TRACK_X, y: y + 34, props: { geo: 'rectangle', w: 1, h: TRACK_H, color: b.color, fill: 'solid', size: 's' } },
			// Buy + hire-manager buttons.
			{ id: buyId, type: 'geo', x: TRACK_X + 10, y, props: { geo: 'rectangle', w: 145, h: 28, color: 'grey', fill: 'solid', size: 's', richText: toRichText('Buy'), verticalAlign: 'middle' } },
			{ id: mgrId, type: 'geo', x: TRACK_X + 165, y, props: { geo: 'rectangle', w: 145, h: 28, color: 'grey', fill: 'solid', size: 's', richText: toRichText('Manager'), verticalAlign: 'middle' } },
		]) // prettier-ignore

		// [5] Click handlers mutate plain game state; the render loop reflects it.
		actions.set(produceId, () => {
			if (b.count > 0 && !b.running) b.running = true
		})
		actions.set(buyId, () => {
			const cost = nextCost(b)
			if (game.money >= cost) {
				game.money -= cost
				b.count++
			}
		})
		actions.set(mgrId, () => {
			if (!b.manager && game.money >= b.managerCost) {
				game.money -= b.managerCost
				b.manager = true
				b.running = true // managers keep the line moving automatically
			}
		})
	})

	editor.toggleLock([
		...actions.keys(),
		titleId,
		moneyId,
		...game.flatMap((b) => [id(`${b.key}-track`), id(`${b.key}-fill`)]),
	])
	editor.zoomToFit({ animation: { duration: 0 } })
	return { actions, moneyId }
}

// [6] Diff-based renderer. Each frame we compare against a cache and only write
// the shapes whose displayed value actually changed, to keep store churn low.
function makeRenderer(editor: Editor, game: Game, moneyId: TLShapeId) {
	const cache = {
		money: '',
		rows: game.map(() => ({ count: -1, fillW: -1, buyAfford: null as boolean | null, mgr: '' })),
	}

	const setLabel = (shapeId: TLShapeId, text: string, color?: TLDefaultColorStyle) => {
		editor.updateShape({
			id: shapeId,
			type: 'geo',
			props: { richText: toRichText(text), ...(color ? { color } : {}) },
		})
	}

	return function render() {
		const moneyStr = formatMoney(game.money)
		if (moneyStr !== cache.money) {
			cache.money = moneyStr
			editor.updateShape({ id: moneyId, type: 'text', props: { richText: toRichText(moneyStr) } })
		}

		game.forEach((b, i) => {
			const c = cache.rows[i]

			const fillW = Math.max(1, TRACK_W * Math.min(1, b.progress))
			if (Math.abs(fillW - c.fillW) >= 1) {
				c.fillW = fillW
				editor.updateShape({ id: id(`${b.key}-fill`), type: 'geo', props: { w: fillW } })
			}

			if (b.count !== c.count) {
				c.count = b.count
				setLabel(id(`${b.key}-produce`), `${b.emoji} ${b.name}\n×${b.count}`)
			}

			const cost = nextCost(b)
			const buyAfford = game.money >= cost
			if (buyAfford !== c.buyAfford || b.count !== c.count) {
				c.buyAfford = buyAfford
				setLabel(id(`${b.key}-buy`), `Buy ×1\n${formatMoney(cost)}`, buyAfford ? 'green' : 'grey')
			}

			const mgr = b.manager ? '✓ Auto-running' : `Manager\n${formatMoney(b.managerCost)}`
			if (mgr !== c.mgr) {
				c.mgr = mgr
				setLabel(
					id(`${b.key}-mgr`),
					mgr,
					b.manager ? 'green' : game.money >= b.managerCost ? 'orange' : 'grey'
				)
			}
		})
	}
}

// [7] Wire everything together inside onMount and return a disposer.
function setupGame(editor: Editor) {
	const game = makeBusinesses() as Game
	game.money = 4

	const { actions, moneyId } = buildBoard(editor, game)
	const render = makeRenderer(editor, game, moneyId)

	const onTick = (elapsedMs: number) => {
		const dt = Math.min(100, elapsedMs) // clamp big catch-up frames after tab idle
		editor.run(
			() => {
				for (const b of game) {
					if (b.running && b.count > 0) {
						b.progress += dt / b.cycleMs
						if (b.progress >= 1) {
							game.money += b.revenue * b.count
							b.progress = b.manager ? b.progress - 1 : 0
							if (!b.manager) b.running = false
						}
					}
				}
				render()
			},
			{ history: 'ignore', ignoreShapeLock: true }
		)
	}

	const onPointer = (info: TLEventInfo) => {
		if (info.type !== 'pointer' || info.name !== 'pointer_down') return
		const hit = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
			hitInside: true,
			hitLocked: true,
		})
		if (!hit) return
		const action = actions.get(hit.id)
		if (!action) return
		editor.run(
			() => {
				action()
				render()
			},
			{ history: 'ignore', ignoreShapeLock: true }
		)
	}

	editor.on('tick', onTick)
	editor.on('event', onPointer)

	return () => {
		editor.off('tick', onTick)
		editor.off('event', onPointer)
	}
}

// [8] Strip the editor chrome so it reads as a game rather than a whiteboard.
const components: TLComponents = {
	Toolbar: null,
	StylePanel: null,
	PageMenu: null,
	MainMenu: null,
	ActionsMenu: null,
	QuickActions: null,
	HelpMenu: null,
	NavigationPanel: null,
	ZoomMenu: null,
	ContextMenu: null,
	KeyboardShortcutsDialog: null,
	DebugMenu: null,
	DebugPanel: null,
	SharePanel: null,
	MenuPanel: null,
}

export default function AdventureCapitalistExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				options={{ createTextOnCanvasDoubleClick: false }}
				onMount={setupGame}
			/>
		</div>
	)
}

/*
[1]
The whole game uses only built-in shapes: `geo` rectangles for buttons and
progress bars, and `text` for the money counter. Shapes hold no game logic —
they're a view that the tick loop keeps in sync with plain JS state.

[2]
Each business owns its economy: a base cost that grows exponentially with the
number owned, a per-cycle revenue, and a cycle duration. Buy more units to earn
more per cycle; hire a manager to automate the cycle.

[3]
Shape ids are derived from a stable string key so the render loop can address
each shape later without holding references.

[4]
We create every shape once, lock them all (so the player can't drag the board
around), and build a map from clickable shape id to its action.

[5]
Clicks only mutate the JS game object. Keeping state out of the shapes means the
renderer is free to redraw from scratch and the store stays simple.

[6]
The renderer diffs against a small cache so each frame writes only the shapes
that changed — typically just the animating progress fill and the money text.

[7]
`editor.on('tick', ...)` drives the simulation. All shape writes run inside
`editor.run(fn, { history: 'ignore', ignoreShapeLock: true })` so game updates
never enter the undo stack and can mutate the locked board shapes.

[8]
Clicks are read from `editor.on('event', ...)`; `getShapeAtPoint` (with
`hitLocked: true`) resolves which board shape was tapped.
*/
