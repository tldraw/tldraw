import { TLUserPreferences } from '../../config/TLUserPreferences'
import { TldrawEditorUser } from '../../config/createTldrawEditorUser'

export class UserPreferencesManager {
	constructor(private readonly user: TldrawEditorUser) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.user.setUserPreferences({
			...this.user.userPreferences.value,
			...userPreferences,
		})
	}

	get isDarkMode() {
		return this.user.userPreferences.value.isDarkMode
	}

	get animationSpeed() {
		return this.editor.config.userPreferences.value.animationSpeed
	}

	get id() {
		return this.user.userPreferences.value.id
	}

	get name() {
		return this.user.userPreferences.value.name
	}

	get locale() {
		return this.user.userPreferences.value.locale
	}

	get color() {
		return this.user.userPreferences.value.color
	}
}
