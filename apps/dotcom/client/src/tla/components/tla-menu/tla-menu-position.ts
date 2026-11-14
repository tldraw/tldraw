import { Select as _Select } from 'radix-ui'

/**
 * Shared positioning for tla dropdowns, popovers, and selects so they sit consistently
 * relative to their triggers. Spread onto a Radix/SDK content element (e.g.
 * `{...TLA_MENU_POSITION}`); tweak here to adjust every tla menu at once. `side` and
 * `align` stay per-menu since they depend on the trigger's placement.
 */
export const TLA_MENU_POSITION = {
	sideOffset: 4,
	alignOffset: -4,
	collisionPadding: 4,
} as const
