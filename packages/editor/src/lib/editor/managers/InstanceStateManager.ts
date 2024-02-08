import { computed } from '@tldraw/state'
import { TLINSTANCE_ID, TLInstance } from '@tldraw/tlschema'
import { Editor } from '../Editor'
import { TLCommandHistoryOptions } from '../types/history-types'

/** @public */
export type InstanceStateUpdate = Partial<Omit<TLInstance, 'currentPageId'>>

/** @public */
export class InstanceStateManager {
	constructor(private readonly editor: Editor) {
		this._update = this.editor.history.createCommand(
			'updateInstanceState',
			(partial: InstanceStateUpdate, historyOptions?: TLCommandHistoryOptions) => {
				const prev = this.editor.store.get(this.getRecord().id)!
				const next = { ...prev, ...partial }

				return {
					data: { prev, next },
					ephemeral: false,
					squashing: false,
					...historyOptions,
				}
			},
			{
				do: ({ next }) => {
					this.editor.store.put([next])
				},
				undo: ({ prev }) => {
					this.editor.store.put([prev])
				},
				squash({ prev }, { next }) {
					return { prev, next }
				},
			}
		)
	}

	@computed getRecord(): TLInstance {
		return this.editor.store.get(TLINSTANCE_ID)!
	}

	private _update: (partial: InstanceStateUpdate, historyOptions?: any) => Editor
	private _isChangingStyleTimeout: ReturnType<typeof setTimeout> | undefined

	/**
	 * Update the instance's state.
	 *
	 * @param partial - A partial object to update the instance state with.
	 * @param historyOptions - The history options for the change.
	 *
	 * @public
	 */
	update(partial: InstanceStateUpdate, historyOptions?: TLCommandHistoryOptions) {
		this._update(partial, { ephemeral: true, squashing: true, ...historyOptions })

		if (partial.isChangingStyle !== undefined) {
			clearTimeout(this._isChangingStyleTimeout)
			if (partial.isChangingStyle === true) {
				// If we've set to true, set a new reset timeout to change the value back to false after 2 seconds
				this._isChangingStyleTimeout = setTimeout(() => {
					this.update({ isChangingStyle: false })
				}, 2000)
			}
		}
	}

	getCurrentPageId() {
		return this.getRecord().currentPageId
	}
	@computed getOpacityForNextShape() {
		return this.getRecord().opacityForNextShape
	}
	@computed getStylesForNextShape() {
		return this.getRecord().stylesForNextShape
	}
	@computed getFollowingUserId() {
		return this.getRecord().followingUserId
	}
	@computed getHighlightedUserIds() {
		return this.getRecord().highlightedUserIds
	}
	@computed getBrush() {
		return this.getRecord().brush
	}
	@computed getCursor() {
		return this.getRecord().cursor
	}
	@computed getScribbles() {
		return this.getRecord().scribbles
	}
	@computed getIsFocusMode() {
		return this.getRecord().isFocusMode
	}
	@computed getIsDebugMode() {
		return this.getRecord().isDebugMode
	}
	@computed getIsToolLocked() {
		return this.getRecord().isToolLocked
	}
	@computed getExportBackground() {
		return this.getRecord().exportBackground
	}
	@computed getScreenBounds() {
		return this.getRecord().screenBounds
	}
	@computed getInsets() {
		return this.getRecord().insets
	}
	@computed getZoomBrush() {
		return this.getRecord().zoomBrush
	}
	@computed getChatMessage() {
		return this.getRecord().chatMessage
	}
	@computed getIsChatting() {
		return this.getRecord().isChatting
	}
	@computed getIsPenMode() {
		return this.getRecord().isPenMode
	}
	@computed getIsGridMode() {
		return this.getRecord().isGridMode
	}
	@computed getCanMoveCamera() {
		return this.getRecord().canMoveCamera
	}
	@computed getIsFocused() {
		return this.getRecord().isFocused
	}
	@computed getDevicePixelRatio() {
		return this.getRecord().devicePixelRatio
	}
	@computed getIsCoarsePointer() {
		return this.getRecord().isCoarsePointer
	}
	@computed getIsHoveringCanvas() {
		return this.getRecord().isHoveringCanvas
	}
	@computed getOpenMenus() {
		return this.getRecord().openMenus
	}
	@computed getIsChangingStyle() {
		return this.getRecord().isChangingStyle
	}
	@computed getIsReadonly() {
		return this.getRecord().isReadonly
	}
	@computed getMeta() {
		return this.getRecord().meta
	}
	@computed getDuplicateProps() {
		return this.getRecord().duplicateProps
	}
}
