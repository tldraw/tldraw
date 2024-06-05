/**
 * Options for configuring tldraw. For defaults, see {@link defaultTldrawOptions}.
 *
 * @example
 * ```tsx
 * const options: Partial<TldrawOptions> = {
 *     maxPages: 3,
 *     maxShapesPerPage: 1000,
 * }
 *
 * function MyTldrawComponent() {
 *     return <Tldraw options={options} />
 * }
 * ```
 *
 * @public
 */
export interface TldrawOptions {
	readonly maxShapesPerPage: number
	readonly maxPages: number
	readonly animationMediumMs: number
	readonly followChaseViewportSnap: number
	readonly doubleClickDurationMs: number
	readonly multiClickDurationMs: number
	readonly coarseDragDistanceSquared: number
	readonly dragDistanceSquared: number
	readonly defaultSvgPadding: number
	readonly cameraSlideFriction: number
	readonly gridSteps: readonly {
		readonly min: number
		readonly mid: number
		readonly step: number
	}[]
	readonly collaboratorInactiveTimeoutMs: number
	readonly collaboratorIdleTimeoutMs: number
	readonly collaboratorCheckIntervalMs: number
	readonly cameraMovingTimeoutMs: number
	readonly hitTestMargin: number
	readonly edgeScrollSpeed: number
	readonly edgeScrollDistance: number
	readonly coarsePointerWidth: number
	readonly coarseHandleRadius: number
	readonly handleRadius: number
	readonly longPressDurationMs: number
	readonly textShadowLod: number
	readonly adjacentShapeMargin: number
}

/** @public */
export const defaultTldrawOptions = {
	maxShapesPerPage: 4000,
	maxPages: 40,
	animationMediumMs: 320,
	followChaseViewportSnap: 2,
	doubleClickDurationMs: 450,
	multiClickDurationMs: 200,
	coarseDragDistanceSquared: 36, // 6 squared
	dragDistanceSquared: 16, // 4 squared
	defaultSvgPadding: 32,
	cameraSlideFriction: 0.09,
	gridSteps: [
		{ min: -1, mid: 0.15, step: 64 },
		{ min: 0.05, mid: 0.375, step: 16 },
		{ min: 0.15, mid: 1, step: 4 },
		{ min: 0.7, mid: 2.5, step: 1 },
	],
	collaboratorInactiveTimeoutMs: 60000,
	collaboratorIdleTimeoutMs: 3000,
	collaboratorCheckIntervalMs: 1200,
	cameraMovingTimeoutMs: 64,
	hitTestMargin: 8,
	edgeScrollSpeed: 20,
	edgeScrollDistance: 8,
	coarsePointerWidth: 12,
	coarseHandleRadius: 20,
	handleRadius: 12,
	longPressDurationMs: 500,
	textShadowLod: 0.35,
	adjacentShapeMargin: 10,
} as const satisfies TldrawOptions
