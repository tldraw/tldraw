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
			...this.user.userPreferences.get(),
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
			this.user.userPreferences.get().isDarkMode ??
			(this.inferDarkMode ? userPrefersDarkUI() : false)
		)
	}

	@computed get animationSpeed() {
		return this.user.userPreferences.get().animationSpeed ?? defaultUserPreferences.animationSpeed
	}

	@computed get id() {
		return this.user.userPreferences.get().id
	}

	@computed get name() {
		return this.user.userPreferences.get().name ?? defaultUserPreferences.name
	}

	@computed get locale() {
		return this.user.userPreferences.get().locale ?? defaultUserPreferences.locale
	}

	@computed get color() {
		return this.user.userPreferences.get().color ?? defaultUserPreferences.color
	}

	@computed get isSnapMode() {
		return this.user.userPreferences.get().isSnapMode ?? defaultUserPreferences.isSnapMode
	}
}
