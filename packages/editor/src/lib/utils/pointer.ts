import { tlenv } from '../globals/environment'

/** @internal */
export function isRightClickLikeEvent(e: { button: number; ctrlKey: boolean; metaKey: boolean }) {
	return e.button === 2 || (tlenv.isDarwin && e.button === 0 && e.ctrlKey && !e.metaKey)
}

/** @internal */
export function getRightClickLikeButton(e: { button: number; ctrlKey: boolean; metaKey: boolean }) {
	return isRightClickLikeEvent(e) ? 2 : e.button
}
