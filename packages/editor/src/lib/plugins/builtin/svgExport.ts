// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { TLShapeId } from '@tldraw/tlschema'
import type { TLSvgExportOptions } from '../../editor/types/misc-types'
import { defineCapability } from '../plugin'

/**
 * Renders shapes to an SVG element. `editor.getSvgElement`, `getSvgString` and `toImage` use it.
 * The React layer provides it.
 *
 * @public
 */
export interface TLSvgExporter {
	exportToSvg(
		shapeIds: TLShapeId[],
		opts: TLSvgExportOptions
	): Promise<{ svg: SVGSVGElement; width: number; height: number; trimPadding: number } | undefined>
}

/** @public */
export const svgExportCapability = defineCapability<TLSvgExporter>('svgExport')
