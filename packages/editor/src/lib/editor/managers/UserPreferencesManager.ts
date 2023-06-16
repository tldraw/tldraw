import { TLUserPreferences } from '../../config/TLUserPreferences'
import { TLUser } from '../../config/createTLUser'

export class UserPreferencesManager {
	constructor(private readonly user: TLUser) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.user.setUserPreferences({
			...this.user.userPreferences.value,
			...userPreferences,
		})
	}

	get userPreferences() {
		return this.user.userPreferences
	}

	get isDarkMode() {
		return this.user.userPreferences.value.isDarkMode
	}

	get animationSpeed() {
		return this.user.userPreferences.value.animationSpeed
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

	get isSnapMode() {
		return this.user.userPreferences.value.isSnapMode
	}
}
