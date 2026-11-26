import { tlenv } from '../globals/environment'

/**
 * Checks if the accelerator key is pressed.
 * @param e - The event to check.
 * @returns True if the accelerator key is pressed, false otherwise.
 * @internal */
export function isAccelKey(e: { metaKey: boolean; ctrlKey: boolean }) {
	return tlenv.isDarwin ? e.metaKey : e.ctrlKey || e.metaKey
}
