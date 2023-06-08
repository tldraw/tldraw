import { TLShape } from '../../../schema/records/TLShape'

export type TLLineLike = Extract<TLShape, { props: { w: number; h: number } }>
