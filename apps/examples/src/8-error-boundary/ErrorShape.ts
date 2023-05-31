import { TLBaseShape } from '@tldraw/tldraw'

export type ErrorShape = TLBaseShape<'error', { w: number; h: number; message: string }>
