import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import type { RecordProps, TLShape } from 'tldraw'
import type { TextLayer } from '../api/marketingApi'

export const MARKETING_ASSET_TYPE = 'marketing-asset'

/** The reviewer's verdict on an idea, used to steer the next batch. */
export type AssetVerdict = 'none' | 'liked' | 'disliked'

/**
 * One generated state of an asset: the text-free background (a tldraw asset id),
 * the text layers rendered over it, the instruction that produced it (empty for
 * the first generation), and a timestamp.
 */
export interface AssetVersion {
	assetId: string
	textLayers: TextLayer[]
	/** Accompanying body copy (the social caption), shown beside the asset. */
	caption: string
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
	/**
	 * When the current generation started, refreshed periodically as a heartbeat
	 * while it runs. In multiplayer this lets a peer tell an actively-generating
	 * asset from one whose client went away mid-render. 0 when not generating.
	 */
	generatingStartedAt: number
	/** The reviewer's like/dislike on this idea; steers the next batch. */
	verdict: AssetVerdict
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
			caption: T.string,
			instruction: T.string,
			createdAt: T.number,
		})
	),
	currentVersion: T.number,
	status: T.literalEnum('idle', 'generating', 'error'),
	error: T.string,
	generatingStartedAt: T.number,
	verdict: T.literalEnum('none', 'liked', 'disliked'),
}

// Versioned migrations for the shape's props. Documents created before a field
// existed are upgraded on load, so older rooms keep working. The same sequence is
// passed to the schema on both the client and the worker.
const Versions = createShapePropsMigrationIds(MARKETING_ASSET_TYPE, {
	AddVerdict: 1,
	AddCaption: 2,
})

export const marketingAssetMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddVerdict,
			up: (props) => {
				props.verdict = 'none'
			},
			down: (props) => {
				delete props.verdict
			},
		},
		{
			id: Versions.AddCaption,
			up: (props) => {
				for (const version of props.versions) {
					version.caption = ''
				}
			},
			down: (props) => {
				for (const version of props.versions) {
					delete version.caption
				}
			},
		},
	],
})
