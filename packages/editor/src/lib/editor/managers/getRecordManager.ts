import { Atom, computed } from '@tldraw/state'

export function getAtomManager<T extends { [key: string]: any }>(
	atom: Atom<T>,
	transform?: (prev: T, next: T) => T
): T {
	const update = (value: Partial<T>) => {
		const curr = atom.get()
		const next = { ...curr, ...value }
		const final = transform?.(atom.get(), atom.get()) ?? next
		atom.set(final)
	}

	return Object.defineProperties(
		{} as T,
		Object.keys(atom.get()).reduce((acc, key) => {
			acc[key as keyof T] = computed(atom, key, {
				get() {
					return atom.get()[key as keyof T]
				},
				set(value: T[keyof T]) {
					update({ [key]: value } as any)
				},
			})
			return acc
		}, {} as { [key in keyof T]: PropertyDescriptor })
	)
}
