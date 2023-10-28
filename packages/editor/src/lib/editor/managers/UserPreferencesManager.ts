import { computed } from '@tldraw/state'
import {
	TLUserPreferences,
	defaultUserPreferences,
	userPrefersDarkUI,
} from '../../config/TLUserPreferences'
import { TLUser } from '../../config/createTLUser'

export class UserPreferencesManager {
	constructor(private readonly user: TLUser, private readonly inferDarkMode: boolean) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.user.setUserPreferences({
			...this.user.userPreferences.value,
			...userPreferences,
		})
	}
	@computed get userPreferences() {
		return {
			id: this.id,
			name: this.name,
			locale: this.locale,
			color: this.color,
			isDarkMode: this.isDarkMode,
			animationSpeed: this.animationSpeed,
			isSnapMode: this.isSnapMode,
		}
	}

	@computed get isDarkMode() {
		return (
			this.user.userPreferences.value.isDarkMode ??
			(this.inferDarkMode ? userPrefersDarkUI() : false)
		)
	}

	@computed get animationSpeed() {
		return this.user.userPreferences.value.animationSpeed ?? defaultUserPreferences.animationSpeed
	}

	@computed get id() {
		return this.user.userPreferences.value.id
	}

	@computed get name() {
		return this.user.userPreferences.value.name ?? defaultUserPreferences.name
	}

	@computed get locale() {
		return this.user.userPreferences.value.locale ?? defaultUserPreferences.locale
	}

	@computed get color() {
		return this.user.userPreferences.value.color ?? defaultUserPreferences.color
	}

	@computed get isSnapMode() {
		return this.user.userPreferences.value.isSnapMode ?? defaultUserPreferences.isSnapMode
	}
}
