import { unwrapLabel, useActions } from '../context/actions'
import { TLUiTranslationKey } from './useTranslation/TLUiTranslationKey'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useCommandBarActions(search: string) {
	const actions = useActions()
	const msg = useTranslation()
	return Object.values(actions)
		.filter((action) => {
			// Don't show actions until we start searching
			if (search === '') return false
			// If we didn't want to show the disabled actions
			// if (!action.enabled?.()) return false
			const unwrapped = unwrapLabel(action.label, 'command-bar')
			const value = msg(unwrapped as TLUiTranslationKey)
			if (!value) return false
			// Alternative to the search check above we can show all actions if we haven't started typing yet
			// if (search === '') return true
			return value.toLowerCase().includes(search.toLowerCase())
		})
		.sort((a, b) => {
			// Enabled actions before disabled ones
			if (!a.enabled?.()) {
				return 1
			}
			if (!b.enabled?.()) {
				return -1
			}
			return 0
		})
}
