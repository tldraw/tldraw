import { T, atom, getFromLocalStorage, setInLocalStorage } from 'tldraw'

const channel =
	typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tldrawUserPreferences') : null

export const userPreferences = {
	showFileOpenWarning: createPreference('showFileOpenWarning', T.boolean, true),
	showFileClearWarning: createPreference('showFileClearWarning', T.boolean, true),
}

if (typeof window !== 'undefined') {
	;(window as any).userPreferences = userPreferences
}

function createPreference<Type>(key: string, validator: T.Validator<Type>, defaultValue: Type) {
	const preferenceAtom = atom(
		`userPreferences.${key}`,
		loadItemFromStorage(key, validator) ?? defaultValue
	)

	channel?.addEventListener('message', (event) => {
		if (event.data.key === key) {
			preferenceAtom.set(event.data.value)
		}
	})

	return {
		get() {
			return preferenceAtom.get()
		},
		set(newValue: Type) {
			preferenceAtom.set(newValue)
			saveItemToStorage(key, newValue)
			channel?.postMessage({ key, value: newValue })
		},
	}
}

function loadItemFromStorage<Type>(key: string, validator: T.Validator<Type>): Type | null {
	const item = getFromLocalStorage(`tldrawUserPreferences.${key}`)
	if (item == null) return null
	try {
		return validator.validate(JSON.parse(item))
	} catch (e) {
		return null
	}
}

function saveItemToStorage(key: string, value: unknown): void {
	setInLocalStorage(`tldrawUserPreferences.${key}`, JSON.stringify(value))
}
