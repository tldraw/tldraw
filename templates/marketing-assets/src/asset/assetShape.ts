import { RecordProps, T, TLShape } from 'tldraw'
import { TextLayer } from '../api/marketingApi'

export const MARKETING_ASSET_TYPE = 'marketing-asset'

/**
 * One generated state of an asset: the text-free background (a tldraw asset id),
 * the text layers rendered over it, the instruction that produced it (empty for
 * the first generation), and a timestamp.
 */
export interface AssetVersion {
	assetId: string
	textLayers: TextLayer[]
	instruction: string
	createdAt: number
}

export interface MarketingAssetProps {
	/** Display width/height on the canvas (scaled down from the output type). */
	w: number
	h: number
	/** The chosen output format id. */
	outputTypeId: string
	/** The brief used for the first generation. */
	prompt: string
	/** Version timeline, oldest first. */
	versions: AssetVersion[]
	/** Index of the version currently shown. */
	currentVersion: number
	status: 'idle' | 'generating' | 'error'
	/** Error message when status is 'error'. */
	error: string
}

// Register the shape in tldraw's global shape map so TLShape<'marketing-asset'>
// resolves and the editor's typed helpers accept it.
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MARKETING_ASSET_TYPE]: MarketingAssetProps
	}
}

export type MarketingAssetShape = TLShape<typeof MARKETING_ASSET_TYPE>

const textLayer = T.object({
	text: T.string,
	x: T.number,
	y: T.number,
	width: T.number,
	fontRole: T.literalEnum('heading', 'body'),
	fontSize: T.number,
	color: T.string,
	align: T.literalEnum('left', 'center', 'right'),
	weight: T.literalEnum('normal', 'bold'),
	scrim: T.boolean,
})

export const marketingAssetProps: RecordProps<MarketingAssetShape> = {
	w: T.number,
	h: T.number,
	outputTypeId: T.string,
	prompt: T.string,
	versions: T.arrayOf(
		T.object({
			assetId: T.string,
			textLayers: T.arrayOf(textLayer),
			instruction: T.string,
			createdAt: T.number,
		})
	),
	currentVersion: T.number,
	status: T.literalEnum('idle', 'generating', 'error'),
	error: T.string,
}
