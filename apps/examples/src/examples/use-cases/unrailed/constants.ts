// Shared world constants. Obstacles and water live on a tile grid; the track the
// player draws is freeform, but page units are still tiles * TILE so everything
// (shapes, overlays, camera) speaks one coordinate system.

export const TILE = 48

// Vertical playable band, in tiles. The starter track runs along the middle row.
export const ROWS = 9
export const TRACK_ROW = 4

// Starter track: a short straight run so the train has something to ride at t=0.
export const START_LEN_TILES = 6
// Where the train front begins, in tiles along the starter track.
export const START_TRAIN_S = TILE * 1.5
// Length of drawable track the player starts with, in tiles.
export const START_BUDGET = 12
export const START_WOOD = 2
export const START_IRON = 3

// Train speed (tiles / second). Ramps up with distance so the run gets harder.
export const TRAIN_BASE_SPEED = 0.5
export const TRAIN_SPEED_RAMP = 0.01 // extra tiles/sec per tile travelled

// Drawing rules (page units).
// A new stroke counts as track if it starts within this of the track head.
export const CONNECT_RADIUS = TILE * 0.9
// Track may not pass this close to an uncleared obstacle / unbridged water.
export const BLOCK_RADIUS = TILE * 0.42
// A chop stroke clears any obstacle whose centre is within this of the stroke.
export const CHOP_RADIUS = TILE * 0.55

// Crafting: the wagon turns 1 wood + 1 iron into this many tiles of track budget
// every CRAFT_MS.
export const CRAFT_MS = 850
export const CRAFT_YIELD_TILES = 2

// How far ahead of the train (in columns) we keep terrain generated.
export const LOOKAHEAD_COLS = 30
// Chance a given tile spawns an obstacle, and the tree/rock split.
export const OBSTACLE_CHANCE = 0.18
export const TREE_RATIO = 0.6
// Columns before obstacles/water start, so the opening is clear.
export const SAFE_COLS = 10

// Rivers: a full-height band of water every RIVER_INTERVAL columns that must be
// bridged before track can cross. Bridges are geo rectangles and cost iron.
export const RIVER_FIRST_COL = 24
export const RIVER_INTERVAL = 28
export const RIVER_WIDTH = 2
export const BRIDGE_COST_IRON = 2

// Camera deadzone: the train can roam this fraction of the viewport before the
// camera pans to follow, keeping the canvas still while you draw.
export const DEADZONE_X = 0.28
export const DEADZONE_Y = 0.3

export type ObstacleKind = 'tree' | 'rock'
