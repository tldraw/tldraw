import { TLBindingUtilConstructor } from '../editor/bindings/BindingUtil'

/** @public */
export type TLAnyBindingUtilConstructor = TLBindingUtilConstructor<any>

/** @public */
export const coreBindings: readonly TLAnyBindingUtilConstructor[] = [
	// no core bindings (yet?)
] as const

const coreBindingTypes = new Set<string>(coreBindings.map((s) => s.type))

export function checkBindingsAndAddCore(customBindings: readonly TLAnyBindingUtilConstructor[]) {
	const bindings = [...coreBindings] as TLAnyBindingUtilConstructor[]

	const addedCustomBindingTypes = new Set<string>()
	for (const customBinding of customBindings) {
		if (coreBindingTypes.has(customBinding.type)) {
			throw new Error(
				`Binding type "${customBinding.type}" is a core bindings type and cannot be overridden`
			)
		}
		if (addedCustomBindingTypes.has(customBinding.type)) {
			throw new Error(`Binding type "${customBinding.type}" is defined more than once`)
		}
		bindings.push(customBinding)
		addedCustomBindingTypes.add(customBinding.type)
	}

	return bindings
}
