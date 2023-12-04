import { computed } from '@tldraw/state'
import { warnDeprecatedGetter } from '@tldraw/utils'
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
	@computed getUserPreferences() {
		return {
			id: this.getId(),
			name: this.getName(),
			locale: this.getLocale(),
			color: this.getColor(),
			isDarkMode: this.getIsDarkMode(),
			animationSpeed: this.getAnimationSpeed(),
			isSnapMode: this.getIsSnapMode(),
		}
	}
	/**
	 * @deprecated use `getUserPreferences` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get userPreferences() {
		warnDeprecatedGetter('userPreferences')
		return this.getUserPreferences()
	}

	@computed getIsDarkMode() {
		return (
			this.user.userPreferences.get().isDarkMode ??
			(this.inferDarkMode ? userPrefersDarkUI() : false)
		)
	}

	/**
	 * @deprecated use `getIsDarkMode` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isDarkMode() {
		warnDeprecatedGetter('isDarkMode')
		return this.getIsDarkMode()
	}

	@computed getAnimationSpeed() {
		return this.user.userPreferences.get().animationSpeed ?? defaultUserPreferences.animationSpeed
	}

	/**
	 * @deprecated use `getAnimationSpeed` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get animationSpeed() {
		warnDeprecatedGetter('animationSpeed')
		return this.getAnimationSpeed()
	}

	@computed getId() {
		return this.user.userPreferences.get().id
	}

	/**
	 * @deprecated use `getId` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get id() {
		warnDeprecatedGetter('id')
		return this.getId()
	}

	@computed getName() {
		return this.user.userPreferences.get().name ?? defaultUserPreferences.name
	}

	/**
	 * @deprecated use `getName` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get name() {
		warnDeprecatedGetter('name')
		return this.getName()
	}

	@computed getLocale() {
		return this.user.userPreferences.get().locale ?? defaultUserPreferences.locale
	}

	/**
	 * @deprecated use `getLocale` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get locale() {
		warnDeprecatedGetter('locale')
		return this.getLocale()
	}

	@computed getColor() {
		return this.user.userPreferences.get().color ?? defaultUserPreferences.color
	}

	/**
	 * @deprecated use `getColor` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get color() {
		warnDeprecatedGetter('color')
		return this.getColor()
	}

	@computed getIsSnapMode() {
		return this.user.userPreferences.get().isSnapMode ?? defaultUserPreferences.isSnapMode
	}

	/**
	 * @deprecated use `getIsSnapMode` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isSnapMode() {
		warnDeprecatedGetter('isSnapMode')
		return this.getIsSnapMode()
	}
}
