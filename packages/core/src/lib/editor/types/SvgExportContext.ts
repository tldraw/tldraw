import { TLAssetId } from '@tldraw/tlschema'
import type { ReactElement } from 'react'

/** @public */
export interface SvgExportDef {
	key: string
	getElement(): Promise<ReactElement | null> | ReactElement | null
}

/** @public */
export interface SvgExportContext {
	/**
	 * Add contents to the `<defs>` section of the export SVG. Each export def should have a unique
	 * key. If multiple defs come with the same key, only one will be added.
	 */
	addExportDef(def: SvgExportDef): void

	/**
	 * Cause the SVG export to be delayed until the returned promise is resolved. This is useful if
	 * e.g. your shape loads data dynamically, and you need to prevent the export from happening
	 * until after the data is loaded.
	 *
	 * See also the `useDelaySvgExport` hook, which may be a more convenient way to use this
	 * method depending on your use-case.
	 */
	waitUntil(promise: Promise<void>): void

	/**
	 * Resolve an asset URL in the context of this export. Supply the asset ID and the width in
	 * shape-pixels it'll be displayed at, and this will resolve the asset according to the export
	 * options.
	 */
	resolveAssetUrl(assetId: TLAssetId, width: number): Promise<string | null>

	/**
	 * Whether the export should be in dark mode.
	 */
	readonly isDarkMode: boolean

	/**
	 * The color mode to use for this export.
	 */
	readonly colorMode: 'light' | 'dark'

	/**
	 * The scale of the export - how much CSS pixels will be scaled up/down by.
	 */
	readonly scale: number

	/**
	 * Use this value to optionally downscale images in the export. If we're exporting directly to
	 * an SVG, this will usually be null, and you shouldn't downscale images. If the export is to a
	 * raster format like PNG, this will be the number of raster pixels in the resulting bitmap per
	 * CSS pixel in the resulting SVG.
	 */
	readonly pixelRatio: number | null
}
