import { EmbedDefinition } from '@tldraw/tlschema'
import { VecLike } from '../../primitives/Vec2d'

/** @public */
export type TLExternalContent =
	| {
			type: 'text'
			point?: VecLike
			text: string
	  }
	| {
			type: 'files'
			files: File[]
			point?: VecLike
			ignoreParent: boolean
	  }
	| {
			type: 'url'
			url: string
			point?: VecLike
	  }
	| {
			type: 'svg-text'
			text: string
			point?: VecLike
	  }
	| {
			type: 'embed'
			url: string
			point?: VecLike
			embed: EmbedDefinition
	  }

/** @public */
export type TLExternalAssetContent = { type: 'file'; file: File } | { type: 'url'; url: string }
