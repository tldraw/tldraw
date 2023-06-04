import { TLShape } from '@tldraw/tlschema'

export type TLLineLike = Extract<TLShape, { props: { w: number; h: number } }>
