import { computed } from '@tldraw/state'
import {
	TLUserPreferences,
	defaultUserPreferences,
	userPrefersDarkUI,
} from '../../config/TLUserPreferences'
import { TLUser } from '../../config/createTLUser'

export class UserPreferencesManager {
	constructor(
		private readonly user: TLUser,
		private readonly inferDarkMode: boolean
	) {}

	updateUserPreferences = (userPreferences: Partial<TLUserPreferences>) => {
		this.user.setUserPreferences({
			...this.user.userPreferences.get(),
			...userPreferences,
		})
	}
	@computed getUserPreferences() {
		return {
			id: this.getId(),
			name: this.getName(),
			locale: this.getLocale(),
			color: this.getColor(),
			animationSpeed: this.getAnimationSpeed(),
			isSnapMode: this.getIsSnapMode(),
			isDarkMode: this.getIsDarkMode(),
			isWrapMode: this.getIsWrapMode(),
		}
	}
	@computed getIsDarkMode() {
		return (
			this.user.userPreferences.get().isDarkMode ??
			(this.inferDarkMode ? userPrefersDarkUI() : false)
		)
	}

	/**
	 * The speed at which the user can scroll by dragging toward the edge of the screen.
	 */
	@computed getEdgeScrollSpeed() {
		return this.user.userPreferences.get().edgeScrollSpeed ?? defaultUserPreferences.edgeScrollSpeed
	}

	@computed getAnimationSpeed() {
		return this.user.userPreferences.get().animationSpeed ?? defaultUserPreferences.animationSpeed
	}

	@computed getId() {
		return this.user.userPreferences.get().id
	}

	@computed getName() {
		return this.user.userPreferences.get().name ?? defaultUserPreferences.name
	}

	@computed getLocale() {
		return this.user.userPreferences.get().locale ?? defaultUserPreferences.locale
	}

	@computed getColor() {
		return this.user.userPreferences.get().color ?? defaultUserPreferences.color
	}

	@computed getIsSnapMode() {
		return this.user.userPreferences.get().isSnapMode ?? defaultUserPreferences.isSnapMode
	}

	@computed getIsWrapMode() {
		return this.user.userPreferences.get().isWrapMode ?? defaultUserPreferences.isWrapMode
	}
}
