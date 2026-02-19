import { vecModelValidator } from '../misc/geometry-types'
import { createBindingPropsMigrationSequence } from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { TLBaseBinding } from './TLBaseBinding'
import type { VecModel } from '../misc/geometry-types'

/** @public */
export interface TLStickerBindingProps {
	anchor: VecModel
	offset: VecModel
}

/** @public */
export type TLStickerBinding = TLBaseBinding<'sticker', TLStickerBindingProps>

/** @public */
export const stickerBindingProps: RecordProps<TLStickerBinding> = {
	anchor: vecModelValidator,
	offset: vecModelValidator,
}

/** @public */
export const stickerBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [],
})
