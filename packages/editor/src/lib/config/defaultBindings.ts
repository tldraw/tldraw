import { TLBindingUtilConstructor } from '../editor/bindings/BindingUtil'

/** @public */
export type TLAnyBindingUtilConstructor = TLBindingUtilConstructor<any>

export function checkBindings(customBindings: readonly TLAnyBindingUtilConstructor[]) {
	const bindings = [] as TLAnyBindingUtilConstructor[]

	const addedCustomBindingTypes = new Set<string>()
	for (const customBinding of customBindings) {
		if (addedCustomBindingTypes.has(customBinding.type)) {
			throw new Error(`Binding type "${customBinding.type}" is defined more than once`)
		}
		bindings.push(customBinding)
		addedCustomBindingTypes.add(customBinding.type)
	}

	return bindings
}
