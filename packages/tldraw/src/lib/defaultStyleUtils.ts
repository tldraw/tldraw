import {
	ColorStyleUtil,
	DefaultColorStyleOptions,
	DefaultColorStyleUtil,
} from './styles/TLColorStyle'
import { DefaultSizeStyleOptions, DefaultSizeStyleUtil, SizeStyleUtil } from './styles/TLSizeStyle'

/** @public */
export const defaultStyleUtils = [DefaultSizeStyleUtil, DefaultColorStyleUtil]

/** @public */
export {
	ColorStyleUtil,
	DefaultColorStyleUtil,
	DefaultSizeStyleUtil,
	SizeStyleUtil,
	type DefaultColorStyleOptions,
	type DefaultSizeStyleOptions,
}
