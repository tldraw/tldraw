/**
 * TypeScript definitions for Monaco intellisense.
 * These provide autocomplete and type hints for the editor and api objects.
 */
export const editorTypeDefinitions = `
interface VecLike {
  x: number
  y: number
  z?: number
}

interface TLCamera {
  id: string
  x: number
  y: number
  z: number
}

interface TLCameraMoveOptions {
  animation?: {
    duration?: number
    easing?: (t: number) => number
  }
  force?: boolean
  immediate?: boolean
}

interface TLShapeId extends String {
  __brand: 'TLShapeId'
}

interface TLBindingId extends String {
  __brand: 'TLBindingId'
}

interface TLShape {
  id: TLShapeId
  type: string
  x: number
  y: number
  rotation: number
  props: Record<string, unknown>
  meta: Record<string, unknown>
}

interface TLBinding {
  id: TLBindingId
  type: string
  fromId: TLShapeId
  toId: TLShapeId
  props: Record<string, unknown>
  meta: Record<string, unknown>
}

interface TLBindingCreate<T = TLBinding> {
  id?: TLBindingId
  type: string
  fromId: TLShapeId
  toId: TLShapeId
  props?: Record<string, unknown>
  meta?: Record<string, unknown>
}

interface TLBindingUpdate<T = TLBinding> {
  id: TLBindingId
  type: string
  props?: Record<string, unknown>
  meta?: Record<string, unknown>
}

type GeoColor = 'black' | 'blue' | 'green' | 'grey' | 'light-blue' | 'light-green' | 'light-red' | 'light-violet' | 'orange' | 'red' | 'violet' | 'white' | 'yellow'
type GeoFill = 'none' | 'semi' | 'solid' | 'pattern'
type GeoSize = 's' | 'm' | 'l' | 'xl'
type GeoFont = 'draw' | 'sans' | 'serif' | 'mono'
type GeoType = 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'rhombus' | 'rhombus-2' | 'oval' | 'trapezoid' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down' | 'x-box' | 'check-box' | 'cloud' | 'heart'

interface ShapeOptions {
  /** Shape color */
  color?: GeoColor
  /** Fill style */
  fill?: GeoFill
  /** Size */
  size?: GeoSize
  /** Font family */
  font?: GeoFont
  /** For geo shapes: the geometry type */
  geo?: GeoType
}

/**
 * The curated API for creating and managing shapes.
 * All shapes created via this API are automatically marked as generated.
 */
interface EditorAPI {
  /**
   * Create a rectangle shape.
   * @param x - X coordinate of top-left corner
   * @param y - Y coordinate of top-left corner
   * @param w - Width
   * @param h - Height
   * @param options - Additional shape properties
   * @returns The created shape ID
   * @example
   * api.createRect(100, 100, 200, 150, { color: 'blue', fill: 'solid' })
   */
  createRect(x: number, y: number, w: number, h: number, options?: ShapeOptions): TLShapeId

  /**
   * Create a circle (ellipse) shape.
   * @param x - X coordinate of center
   * @param y - Y coordinate of center
   * @param radius - Radius of the circle
   * @param options - Additional shape properties
   * @returns The created shape ID
   * @example
   * api.createCircle(300, 200, 50, { color: 'red', fill: 'semi' })
   */
  createCircle(x: number, y: number, radius: number, options?: ShapeOptions): TLShapeId

  /**
   * Create a text shape.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param text - Text content
   * @param options - Additional shape properties
   * @returns The created shape ID
   * @example
   * api.createText(100, 100, 'Hello World!', { color: 'violet', size: 'xl' })
   */
  createText(x: number, y: number, text: string, options?: ShapeOptions): TLShapeId

  /**
   * Create an arrow shape between two points.
   * @param fromX - Starting X coordinate
   * @param fromY - Starting Y coordinate
   * @param toX - Ending X coordinate
   * @param toY - Ending Y coordinate
   * @param options - Additional shape properties
   * @returns The created shape ID
   * @example
   * api.createArrow(100, 100, 300, 200, { color: 'blue' })
   */
  createArrow(fromX: number, fromY: number, toX: number, toY: number, options?: ShapeOptions): TLShapeId

  /**
   * Clear all generated shapes from the canvas.
   * Hand-drawn shapes are preserved.
   */
  clear(): void

  /**
   * Get all shapes on the current page.
   * @returns Array of all shapes
   */
  getAllShapes(): TLShape[]

  /**
   * Get only the generated shapes (created via the API).
   * @returns Array of generated shapes
   */
  getGeneratedShapes(): TLShape[]

  /**
   * Get the current camera position and zoom level.
   * @returns The current camera state
   */
  getCamera(): TLCamera

  /**
   * Set the camera position and zoom level.
   * @param point - The new camera position (x, y) and optional zoom (z)
   * @param options - Optional camera move options
   * @example
   * api.setCamera({ x: 0, y: 0, z: 1 })
   * api.setCamera({ x: 100, y: 200 }, { animation: { duration: 500 } })
   */
  setCamera(point: VecLike, options?: TLCameraMoveOptions): void

  /**
   * Center the camera on a point in page space.
   * @param point - The point to center on
   * @param options - Optional camera move options
   * @example
   * api.centerOnPoint({ x: 100, y: 100 })
   */
  centerOnPoint(point: VecLike, options?: TLCameraMoveOptions): void

  /**
   * Zoom the camera in.
   * @param point - Optional screen point to zoom on
   * @param options - Optional camera move options
   */
  zoomIn(point?: VecLike, options?: TLCameraMoveOptions): void

  /**
   * Zoom the camera out.
   * @param point - Optional screen point to zoom on
   * @param options - Optional camera move options
   */
  zoomOut(point?: VecLike, options?: TLCameraMoveOptions): void

  /**
   * Zoom to fit all content on the current page.
   * @param options - Optional camera move options
   */
  zoomToFit(options?: TLCameraMoveOptions): void

  /**
   * Zoom to fit the current selection.
   * @param options - Optional camera move options
   */
  zoomToSelection(options?: TLCameraMoveOptions): void

  /**
   * Reset the zoom level to 100%.
   * @param point - Optional screen point to zoom on
   * @param options - Optional camera move options
   */
  resetZoom(point?: VecLike, options?: TLCameraMoveOptions): void

  /**
   * Get all bindings on the current page.
   * @returns Array of all bindings
   */
  getAllBindings(): TLBinding[]

  /**
   * Get bindings from a specific shape (where the shape is the source).
   * @param shape - The shape or shape ID
   * @param type - Optional binding type to filter by
   */
  getBindingsFromShape<T extends TLBinding = TLBinding>(shape: TLShape | TLShapeId, type?: string): T[]

  /**
   * Get bindings to a specific shape (where the shape is the target).
   * @param shape - The shape or shape ID
   * @param type - Optional binding type to filter by
   */
  getBindingsToShape<T extends TLBinding = TLBinding>(shape: TLShape | TLShapeId, type?: string): T[]

  /**
   * Get all bindings involving a specific shape.
   * @param shape - The shape or shape ID
   * @param type - Optional binding type to filter by
   */
  getBindingsInvolvingShape<T extends TLBinding = TLBinding>(shape: TLShape | TLShapeId, type?: string): T[]

  /**
   * Create a binding between two shapes.
   * @param partial - Binding data
   * @returns The created binding
   */
  createBinding<T extends TLBinding = TLBinding>(partial: TLBindingCreate<T>): T | undefined

  /**
   * Create multiple bindings at once.
   * @param partials - Array of binding data
   */
  createBindings<T extends TLBinding = TLBinding>(partials: TLBindingCreate<T>[]): void

  /**
   * Update a binding.
   * @param partial - Binding update data
   */
  updateBinding<T extends TLBinding = TLBinding>(partial: TLBindingUpdate<T>): void

  /**
   * Update multiple bindings at once.
   * @param partials - Array of binding updates
   */
  updateBindings<T extends TLBinding = TLBinding>(partials: TLBindingUpdate<T>[]): void

  /**
   * Delete a binding.
   * @param binding - The binding or binding ID to delete
   * @param options - Optional deletion options
   */
  deleteBinding(binding: TLBinding | TLBindingId, options?: { isolateShapes?: boolean }): void

  /**
   * Delete multiple bindings at once.
   * @param bindings - Array of bindings or binding IDs
   * @param options - Optional deletion options
   */
  deleteBindings(bindings: (TLBinding | TLBindingId)[], options?: { isolateShapes?: boolean }): void
}

/**
 * The tldraw Editor instance.
 * Provides full access to the canvas state and operations.
 */
interface Editor {
  /** Run a function within a single transaction */
  run<T>(fn: () => T): T

  /** Create shapes on the canvas */
  createShapes(shapes: Array<{
    id?: TLShapeId
    type: string
    x: number
    y: number
    rotation?: number
    props?: Record<string, unknown>
    meta?: Record<string, unknown>
  }>): void

  /** Update existing shapes */
  updateShapes(shapes: Array<{
    id: TLShapeId
    type: string
    x?: number
    y?: number
    rotation?: number
    props?: Record<string, unknown>
    meta?: Record<string, unknown>
  }>): void

  /** Delete shapes by ID */
  deleteShapes(ids: TLShapeId[]): void

  /** Get all shapes on the current page */
  getCurrentPageShapes(): TLShape[]

  /** Get a shape by ID */
  getShape(id: TLShapeId): TLShape | undefined

  /** Get the current camera */
  getCamera(): TLCamera

  /** Set the camera position */
  setCamera(point: VecLike, options?: TLCameraMoveOptions): void

  /** Center the camera on a point */
  centerOnPoint(point: VecLike, options?: TLCameraMoveOptions): void

  /** Zoom in */
  zoomIn(point?: VecLike, options?: TLCameraMoveOptions): void

  /** Zoom out */
  zoomOut(point?: VecLike, options?: TLCameraMoveOptions): void

  /** Zoom to fit all content */
  zoomToFit(options?: TLCameraMoveOptions): void

  /** Zoom to fit selection */
  zoomToSelection(options?: TLCameraMoveOptions): void

  /** Reset zoom to 100% */
  resetZoom(point?: VecLike, options?: TLCameraMoveOptions): void

  /** Select shapes by ID */
  select(...ids: TLShapeId[]): void

  /** Select all shapes */
  selectAll(): void

  /** Deselect all shapes */
  selectNone(): void

  /** Get selected shape IDs */
  getSelectedShapeIds(): TLShapeId[]

  /** Get selected shapes */
  getSelectedShapes(): TLShape[]

  /** Create a binding */
  createBinding(partial: TLBindingCreate): void

  /** Create multiple bindings */
  createBindings(partials: TLBindingCreate[]): void

  /** Update a binding */
  updateBinding(partial: TLBindingUpdate): void

  /** Update multiple bindings */
  updateBindings(partials: TLBindingUpdate[]): void

  /** Delete a binding */
  deleteBinding(binding: TLBinding | TLBindingId, options?: { isolateShapes?: boolean }): void

  /** Delete multiple bindings */
  deleteBindings(bindings: (TLBinding | TLBindingId)[], options?: { isolateShapes?: boolean }): void

  /** Get bindings involving a shape */
  getBindingsInvolvingShape(shape: TLShape | TLShapeId, type?: string): TLBinding[]

  /** Get bindings from a shape */
  getBindingsFromShape(shape: TLShape | TLShapeId, type?: string): TLBinding[]

  /** Get bindings to a shape */
  getBindingsToShape(shape: TLShape | TLShapeId, type?: string): TLBinding[]
}

/** The curated API for creating shapes and controlling the canvas */
declare const api: EditorAPI

/** The full tldraw Editor instance */
declare const editor: Editor
`
