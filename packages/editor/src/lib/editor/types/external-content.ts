import { VecLike } from '@tldraw/primitives'
import { EmbedDefinition } from '@tldraw/tlschema'

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
