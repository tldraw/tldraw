import { computed } from '@tldraw/state'
import { TLUserPreferences } from '../../config/TLUserPreferences'
import { TLUser } from '../../config/createTLUser'

export class UserPreferencesManager {
	constructor(private readonly user: TLUser) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.user.setUserPreferences({
			...this.userPreferences,
			...userPreferences,
		})
	}

	@computed get userPreferences() {
		return this.user.userPreferences.value
	}

	@computed get isDarkMode() {
		return this.userPreferences.isDarkMode
	}

	@computed get animationSpeed() {
		return this.userPreferences.animationSpeed
	}

	@computed get id() {
		return this.userPreferences.id
	}

	@computed get name() {
		return this.userPreferences.name
	}

	@computed get locale() {
		return this.userPreferences.locale
	}

	@computed get color() {
		return this.userPreferences.color
	}

	@computed get isSnapMode() {
		return this.userPreferences.isSnapMode
	}
}
