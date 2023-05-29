import { TLUserPreferences } from '../../config/TLUserPreferences'
import { App } from '../App'

export class UserPreferencesManager {
	constructor(private readonly editor: App) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.editor.config.setUserPreferences({
			...this.editor.config.userPreferences.value,
			...userPreferences,
		})
	}

	get isDarkMode() {
		return this.editor.config.userPreferences.value.isDarkMode
	}

	get id() {
		return this.editor.config.userPreferences.value.id
	}

	get name() {
		return this.editor.config.userPreferences.value.name
	}

	get locale() {
		return this.editor.config.userPreferences.value.locale
	}

	get color() {
		return this.editor.config.userPreferences.value.color
	}

	get reduceMotion() {
		return this.editor.config.userPreferences.value.reduceMotion
	}
}
