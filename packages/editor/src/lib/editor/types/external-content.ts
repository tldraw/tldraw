import { EmbedDefinition } from '@tldraw/tlschema'
import { VecLike } from '../../primitives/Vec2d'
import { TLContent } from './clipboard-types'

/** @public */
export type TLExternalContentSource =
	| {
			type: 'tldraw'
			data: TLContent
	  }
	| {
			type: 'excalidraw'
			data: any
	  }
	| {
			type: 'text'
			data: string
			subtype: 'json' | 'html' | 'text' | 'url'
	  }
	| {
			type: 'error'
			data: string | null
			reason: string
	  }

/** @public */
export type TLExternalContent = {
	sources?: TLExternalContentSource[]
	point?: VecLike
} & (
	| {
			type: 'text'
			text: string
	  }
	| {
			type: 'files'
			files: File[]
			ignoreParent: boolean
	  }
	| {
			type: 'url'
			url: string
	  }
	| {
			type: 'svg-text'
			text: string
	  }
	| {
			type: 'embed'
			url: string
			embed: EmbedDefinition
	  }
)

/** @public */
export type TLExternalAssetContent = { type: 'file'; file: File } | { type: 'url'; url: string }
