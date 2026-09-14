import { estimateNominals, layoutBook } from './layout'
import { book } from './summaries'

/**
 * The layout is a pure function of content that never changes, so it runs once
 * at module load and is shared by the canvas layer and the opening camera.
 */
const layout = layoutBook(book)

export const placedNodes = layout.nodes
export const separators = layout.separators
export const nominalFonts = estimateNominals(placedNodes)

/** The root rect, which every other rect is nested inside. */
export const bookBounds = placedNodes[0].rect
