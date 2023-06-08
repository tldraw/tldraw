import { TLInstancePropsForNextShape } from '../schema/records/TLInstance'
import { TLShapeProps } from '../schema/records/TLShape'
import { TL_STYLE_TYPES, TLStyleType } from '../schema/styles/TLBaseStyle'

/** @public */
export function setPropsForNextShape(
	previousProps: TLInstancePropsForNextShape,
	newProps: Partial<TLShapeProps>
): TLInstancePropsForNextShape {
	let nextProps: null | TLInstancePropsForNextShape = null
	for (const [prop, value] of Object.entries(newProps)) {
		if (!TL_STYLE_TYPES.has(prop as TLStyleType)) continue
		if (!nextProps) nextProps = { ...previousProps }
		// @ts-expect-error typescript can't track `value` correctly
		nextProps[prop] = value
	}
	return nextProps ?? previousProps
}
