// This module is part of the headless core. It must not import React or touch the DOM.
import type { TLShape, TLShapeId } from '@tldraw/tlschema'
import type { TLImageExportOptions, TLSvgExportOptions } from '../../editor/types/misc-types'
import { defineCapability } from '../plugin'

/**
 * Turns exported SVG into a string or an image. `editor.getSvgString`, `toImage` and
 * `toImageDataUrl` use it. Each method takes the same shapes as `editor.getSvgElement`: an empty
 * list exports the current page.
 *
 * @public
 */
export interface TLImageExporter {
	/** Serialize the exported SVG element to a string, or undefined when there is nothing to export. */
	getSvgString(
		shapes: TLShapeId[] | TLShape[],
		opts: TLSvgExportOptions
	): Promise<{ svg: string; width: number; height: number; trimPadding: number } | undefined>
	/** Encode the export as an image blob in `opts.format` (PNG by default). */
	toImage(
		shapes: TLShapeId[] | TLShape[],
		opts: TLImageExportOptions
	): Promise<{ blob: Blob; width: number; height: number }>
	/** Encode the export as an image data URL. */
	toImageDataUrl(
		shapes: TLShapeId[] | TLShape[],
		opts: TLImageExportOptions
	): Promise<{ url: string; width: number; height: number }>
}

/** @public */
export const imageExportCapability = defineCapability<TLImageExporter>('imageExport')
