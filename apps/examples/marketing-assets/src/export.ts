import JSZip from 'jszip'
import { Editor } from 'tldraw'
import { TextLayer } from './api/marketingApi'
import { getAssetShapes } from './asset/assetActions'
import { MarketingAssetShape } from './asset/assetShape'
import { getOutputType } from './constants'

/** Which assets to include in an export. */
export type ExportScope = 'liked' | 'selected' | 'all'

/**
 * A filename base that identifies the asset and the render being exported, e.g.
 * `asset-V1StGXR8-v2`. The id comes from the shape (stable across sessions, so a
 * file downloaded on its own and the same asset in a zip share a name); the `vN`
 * suffix is the 1-based version currently shown.
 */
function assetFileBase(shape: MarketingAssetShape): string {
	const id = shape.id.replace(/^shape:/, '').slice(0, 8)
	const render = shape.props.currentVersion + 1
	return `asset-${id}-v${render}`
}

/** The asset shapes an export scope resolves to, top-to-bottom, left-to-right. */
export function exportTargets(editor: Editor, scope: ExportScope): MarketingAssetShape[] {
	let shapes = getAssetShapes(editor).filter((s) => s.props.versions.length > 0)
	if (scope === 'liked') shapes = shapes.filter((s) => s.props.verdict === 'liked')
	if (scope === 'selected') {
		const selected = new Set(editor.getSelectedShapeIds())
		shapes = shapes.filter((s) => selected.has(s.id))
	}
	return shapes.sort((a, b) => a.y - b.y || a.x - b.x)
}

/**
 * Export the chosen assets as a zip: a full-resolution PNG per idea, each asset's
 * accompanying caption as a `captions/*.txt`, plus a `copy.csv` listing every text
 * layer and caption, ready to drop into an ad platform.
 */
export async function exportCampaign(editor: Editor, scope: ExportScope): Promise<number> {
	const targets = exportTargets(editor, scope)
	if (targets.length === 0) return 0

	const zip = new JSZip()
	const images = zip.folder('images')!
	const captions = zip.folder('captions')!
	const csvRows: string[][] = [['asset', 'format', 'platform', 'layer', 'role', 'copy']]

	for (let i = 0; i < targets.length; i++) {
		const shape = targets[i]
		const name = assetFileBase(shape)
		const outputType = getOutputType(shape.props.outputTypeId)
		const platform = outputType.platform ?? ''

		const png = await rasterizeAsset(editor, shape)
		if (png) images.file(`${name}.png`, png)

		const version = shape.props.versions[shape.props.currentVersion]
		const layers = version?.textLayers ?? []
		if (layers.length === 0) {
			csvRows.push([name, outputType.label, platform, '', '', ''])
		} else {
			layers.forEach((layer: TextLayer, j) => {
				csvRows.push([name, outputType.label, platform, String(j + 1), layer.fontRole, layer.text])
			})
		}

		// The accompanying copy: a row in the sheet plus a ready-to-paste text file.
		const caption = version?.caption ?? ''
		if (caption) {
			csvRows.push([name, outputType.label, platform, '', 'caption', caption])
			captions.file(`${name}.txt`, caption)
		}
	}

	zip.file('copy.csv', toCsv(csvRows))
	const blob = await zip.generateAsync({ type: 'blob' })
	downloadBlob(blob, 'marketing-assets.zip')
	return targets.length
}

/** Download a single asset as a full-resolution PNG. */
export async function downloadAsset(editor: Editor, shape: MarketingAssetShape): Promise<void> {
	const png = await rasterizeAsset(editor, shape)
	if (png) downloadBlob(png, `${assetFileBase(shape)}.png`)
}

/**
 * Render one asset to a PNG at its true output resolution. The shape's geometry
 * includes the on-canvas control bar, so we render at output scale and crop that
 * strip off the bottom, leaving just the background and its text.
 */
async function rasterizeAsset(editor: Editor, shape: MarketingAssetShape): Promise<Blob | null> {
	const outputType = getOutputType(shape.props.outputTypeId)
	// The display frame is scaled down from the real pixel size; scale the export
	// back up so the PNG matches the platform's expected dimensions.
	const scale = outputType.width / shape.props.w
	const result = await editor.toImage([shape.id], {
		format: 'png',
		background: true,
		padding: 0,
		scale,
	})
	if (!result?.blob) return null
	return cropTo(result.blob, outputType.width, outputType.height)
}

/** Crop the top-left width×height region of a PNG blob (drops the footer strip). */
async function cropTo(blob: Blob, width: number, height: number): Promise<Blob> {
	const bitmap = await createImageBitmap(blob)
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) return blob
	ctx.drawImage(bitmap, 0, 0, width, height, 0, 0, width, height)
	bitmap.close()
	return new Promise<Blob>((resolve) => canvas.toBlob((out) => resolve(out ?? blob), 'image/png'))
}

/** Serialize rows to CSV, quoting fields that contain commas, quotes, or newlines. */
function toCsv(rows: string[][]): string {
	return rows
		.map((row) =>
			row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
		)
		.join('\n')
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}
