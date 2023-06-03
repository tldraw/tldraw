import type { ID, UnknownRecord } from '@tldraw/store'
import { T } from '@tldraw/tlvalidate'
import type { TLAssetId } from './records/TLAsset'
import type { TLInstanceId } from './records/TLInstance'
import type { TLPageId } from './records/TLPage'
import type { TLParentId, TLShapeId } from './records/TLShape'
import {
	TLAlignType,
	TL_ALIGN_TYPES_WITH_LEGACY_STUFF,
	TL_ARROWHEAD_TYPES,
	TL_COLOR_TYPES,
	TL_DASH_TYPES,
	TL_FILL_TYPES,
	TL_FONT_TYPES,
	TL_GEO_TYPES,
	TL_ICON_TYPES,
	TL_OPACITY_TYPES,
	TL_SIZE_TYPES,
	TL_SPLINE_TYPES,
	TL_VERTICAL_ALIGN_TYPES,
} from './style-types'

/** @internal */
export function idValidator<Id extends ID<UnknownRecord>>(
	prefix: Id['__type__']['typeName']
): T.Validator<Id> {
	return T.string.refine((id) => {
		if (!id.startsWith(`${prefix}:`)) {
			throw new Error(`${prefix} ID must start with "${prefix}:"`)
		}
		return id as Id
	})
}
/** @internal */
export const assetIdValidator = idValidator<TLAssetId>('asset')
/** @internal */
export const pageIdValidator = idValidator<TLPageId>('page')
/** @internal */
export const shapeIdValidator = idValidator<TLShapeId>('shape')
/** @internal */
export const instanceIdValidator = idValidator<TLInstanceId>('instance')

/** @internal */
export const parentIdValidator = T.string.refine((id) => {
	if (!id.startsWith('page:') && !id.startsWith('shape:')) {
		throw new Error('Parent ID must start with "page:" or "shape:"')
	}
	return id as TLParentId
})

/** @internal */
export const colorValidator = T.setEnum(TL_COLOR_TYPES)
/** @internal */
export const dashValidator = T.setEnum(TL_DASH_TYPES)
/** @internal */
export const fillValidator = T.setEnum(TL_FILL_TYPES)
/** @internal */
export const geoValidator = T.setEnum(TL_GEO_TYPES)
/** @internal */
export const sizeValidator = T.setEnum(TL_SIZE_TYPES)
/** @internal */
export const fontValidator = T.setEnum(TL_FONT_TYPES)
/** @internal */
export const alignValidator = T.setEnum<TLAlignType>(
	TL_ALIGN_TYPES_WITH_LEGACY_STUFF as Set<TLAlignType>
)
/** @internal */
export const verticalAlignValidator = T.setEnum(TL_VERTICAL_ALIGN_TYPES)
/** @internal */
export const arrowheadValidator = T.setEnum(TL_ARROWHEAD_TYPES)
/** @internal */
export const opacityValidator = T.setEnum(TL_OPACITY_TYPES)
/** @internal */
export const iconValidator = T.setEnum(TL_ICON_TYPES)
/** @internal */
export const splineValidator = T.setEnum(TL_SPLINE_TYPES)
