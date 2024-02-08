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
				const prev = this.editor.store.get(this.get().id)!
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

	get(): TLInstance {
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

	@computed getCurrentPageId() {
		return this.get().currentPageId
	}
	@computed getOpacityForNextShape() {
		return this.get().opacityForNextShape
	}
	@computed getStylesForNextShape() {
		return this.get().stylesForNextShape
	}
	@computed getFollowingUserId() {
		return this.get().followingUserId
	}
	@computed getHighlightedUserIds() {
		return this.get().highlightedUserIds
	}
	@computed getBrush() {
		return this.get().brush
	}
	@computed getCursor() {
		return this.get().cursor
	}
	@computed getScribbles() {
		return this.get().scribbles
	}
	@computed getIsFocusMode() {
		return this.get().isFocusMode
	}
	@computed getIsDebugMode() {
		return this.get().isDebugMode
	}
	@computed getIsToolLocked() {
		return this.get().isToolLocked
	}
	@computed getExportBackground() {
		return this.get().exportBackground
	}
	@computed getScreenBounds() {
		return this.get().screenBounds
	}
	@computed getInsets() {
		return this.get().insets
	}
	@computed getZoomBrush() {
		return this.get().zoomBrush
	}
	@computed getChatMessage() {
		return this.get().chatMessage
	}
	@computed getIsChatting() {
		return this.get().isChatting
	}
	@computed getIsPenMode() {
		return this.get().isPenMode
	}
	@computed getIsGridMode() {
		return this.get().isGridMode
	}
	@computed getCanMoveCamera() {
		return this.get().canMoveCamera
	}
	@computed getIsFocused() {
		return this.get().isFocused
	}
	@computed getDevicePixelRatio() {
		return this.get().devicePixelRatio
	}
	@computed getIsCoarsePointer() {
		return this.get().isCoarsePointer
	}
	@computed getIsHoveringCanvas() {
		return this.get().isHoveringCanvas
	}
	@computed getOpenMenus() {
		return this.get().openMenus
	}
	@computed getIsChangingStyle() {
		return this.get().isChangingStyle
	}
	@computed getIsReadonly() {
		return this.get().isReadonly
	}
	@computed getMeta() {
		return this.get().meta
	}
	@computed getDuplicateProps() {
		return this.get().duplicateProps
	}
}
