// Tuning constants and the shared shape/colour vocabulary. Kept free of tldraw
// imports so the pure simulation (sim.ts) can use them too.

// The fixed map the game is played on, in page space. The camera fits this box
// at the start; machines only ever live inside it so nothing drifts off-screen.
export const WORLD = { minX: 0, minY: 0, maxX: 1040, maxY: 640 }

export const MACHINE_R = 30 // machine radius in page units
export const ITEM_R = 8 // drawn radius of an item travelling a belt
export const ITEM_SPEED = 130 // page units per second along a belt
export const ITEM_GAP = 26 // minimum spacing between items on a belt
export const BUFFER_CAP = 6 // items a machine may hold before it stalls

export const EXTRACT_MS = 1400 // an extractor emits a raw item this often
export const PAINT_MS = 700 // a painter processes one item this often
export const HUB_MS = 350 // the hub consumes one item this often
export const FLASH_MS = 480 // how long the hub pulses after consuming an item

// The item shapes, drawn with real tldraw geo shapes. Like Mini Metro, the whole
// language is geometric shapes, which maps one-to-one onto tldraw's geo styles.
export type ItemShape = 'circle' | 'square' | 'triangle'

// The shapes raw extractors produce, in fixed order down the left edge.
export const RAW_SHAPES: ItemShape[] = ['circle', 'square', 'triangle']

// tldraw palette colour names. 'grey' is the colour of raw, unpainted items; the
// rest are the colours a painter can apply. Using palette names directly lets the
// overlays index the tldraw theme so items read as genuinely tldraw.
export type ItemColor = 'grey' | 'blue' | 'red' | 'green'

// The colours available from painters (one painter per colour).
export const PAINT_COLORS: ItemColor[] = ['blue', 'red', 'green']

export type MachineKind = 'extractor' | 'painter' | 'hub'

// Maps each machine kind to a tldraw `geo` style, so each machine reads as a
// distinct, recognisable node. There's no 'circle' geo, so a round node would be
// an ellipse with equal width and height.
export const GEO_FOR_MACHINE: Record<MachineKind, string> = {
	extractor: 'rectangle',
	painter: 'diamond',
	hub: 'octagon',
}

// Maps an item shape to the tldraw `geo` style used to draw it.
export const GEO_FOR_SHAPE: Record<ItemShape, string> = {
	circle: 'ellipse',
	square: 'rectangle',
	triangle: 'triangle',
}
