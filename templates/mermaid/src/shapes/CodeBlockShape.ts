/**
 * Type definition for the code block shape
 */

import { TLShape } from 'tldraw'

export const CODE_BLOCK_SHAPE_TYPE = 'code-block'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CODE_BLOCK_SHAPE_TYPE]: {
			code: string
			language: string
			w: number
			h: number
		}
	}
}

export type CodeBlockShape = TLShape<typeof CODE_BLOCK_SHAPE_TYPE>
