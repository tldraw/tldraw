import {
	COARSE_DRAG_DISTANCE,
	DOUBLE_CLICK_DURATION,
	DRAG_DISTANCE,
	MULTI_CLICK_DURATION,
} from '../../constants'
import { Vec } from '../../primitives/Vec'
import { uniqueId } from '../../utils/uniqueId'
import type { Editor } from '../Editor'
import { TLClickEventInfo, TLPointerEventInfo } from '../types/event-types'

type TLClickState =
	| 'idle'
	| 'pendingDouble'
	| 'pendingTriple'
	| 'pendingQuadruple'
	| 'pendingOverflow'
	| 'overflow'

const MAX_CLICK_DISTANCE = 40

export class ClickManager {
	constructor(public editor: Editor) {}

	private _clickId = ''

	private _clickTimeout?: any

	private _clickScreenPoint?: Vec

	private _previousScreenPoint?: Vec

	private _getClickTimeout = (state: TLClickState, id = uniqueId()) => {
		this._clickId = id
		clearTimeout(this._clickTimeout)
		this._clickTimeout = setTimeout(
			() => {
				if (this._clickState === state && this._clickId === id) {
					switch (this._clickState) {
						case 'pendingTriple': {
							this.editor.dispatch({
								...this.lastPointerInfo,
								type: 'click',
								name: 'double_click',
								phase: 'settle',
							})
							break
						}
						case 'pendingQuadruple': {
							this.editor.dispatch({
								...this.lastPointerInfo,
								type: 'click',
								name: 'triple_click',
								phase: 'settle',
							})
							break
						}
						case 'pendingOverflow': {
							this.editor.dispatch({
								...this.lastPointerInfo,
								type: 'click',
								name: 'quadruple_click',
								phase: 'settle',
							})
							break
						}
						default: {
							// noop
						}
					}

					this._clickState = 'idle'
				}
			},
			state === 'idle' || state === 'pendingDouble' ? DOUBLE_CLICK_DURATION : MULTI_CLICK_DURATION
		)
	}

	/**
	 * The current click state.
	 *
	 * @internal
	 */
	private _clickState?: TLClickState = 'idle'

	/**
	 * The current click state.
	 *
	 * @public
	 */
	// eslint-disable-next-line no-restricted-syntax
	get clickState() {
		return this._clickState
	}

	lastPointerInfo = {} as TLPointerEventInfo

	handlePointerEvent = (info: TLPointerEventInfo): TLPointerEventInfo | TLClickEventInfo => {
		switch (info.name) {
			case 'pointer_down': {
				if (!this._clickState) return info
				this._clickScreenPoint = Vec.From(info.point)

				if (
					this._previousScreenPoint &&
					Vec.Dist2(this._previousScreenPoint, this._clickScreenPoint) > MAX_CLICK_DISTANCE ** 2
				) {
					this._clickState = 'idle'
				}

				this._previousScreenPoint = this._clickScreenPoint

				this.lastPointerInfo = info

				switch (this._clickState) {
					case 'pendingDouble': {
						this._clickState = 'pendingTriple'
						this._clickTimeout = this._getClickTimeout(this._clickState)
						return {
							...info,
							type: 'click',
							name: 'double_click',
							phase: 'down',
						}
					}
					case 'pendingTriple': {
						this._clickState = 'pendingQuadruple'
						this._clickTimeout = this._getClickTimeout(this._clickState)
						return {
							...info,
							type: 'click',
							name: 'triple_click',
							phase: 'down',
						}
					}
					case 'pendingQuadruple': {
						this._clickState = 'pendingOverflow'
						this._clickTimeout = this._getClickTimeout(this._clickState)
						return {
							...info,
							type: 'click',
							name: 'quadruple_click',
							phase: 'down',
						}
					}
					case 'idle': {
						this._clickState = 'pendingDouble'
						break
					}
					case 'pendingOverflow': {
						this._clickState = 'overflow'
						break
					}
					default: {
						// overflow
					}
				}
				this._clickTimeout = this._getClickTimeout(this._clickState)
				return info
			}
			case 'pointer_up': {
				if (!this._clickState) return info
				this._clickScreenPoint = Vec.From(info.point)

				switch (this._clickState) {
					case 'pendingTriple': {
						return {
							...this.lastPointerInfo,
							type: 'click',
							name: 'double_click',
							phase: 'up',
						}
					}
					case 'pendingQuadruple': {
						return {
							...this.lastPointerInfo,
							type: 'click',
							name: 'triple_click',
							phase: 'up',
						}
					}
					case 'pendingOverflow': {
						return {
							...this.lastPointerInfo,
							type: 'click',
							name: 'quadruple_click',
							phase: 'up',
						}
					}
					default: {
						// idle, pendingDouble, overflow
					}
				}

				return info
			}
			case 'pointer_move': {
				if (
					this._clickState !== 'idle' &&
					this._clickScreenPoint &&
					Vec.Dist2(this._clickScreenPoint, this.editor.inputs.currentScreenPoint) >
						(this.editor.getInstanceState().isCoarsePointer ? COARSE_DRAG_DISTANCE : DRAG_DISTANCE)
				) {
					this.cancelDoubleClickTimeout()
				}
				return info
			}
		}
		return info
	}

	/**
	 * Cancel the double click timeout.
	 *
	 * @internal
	 */
	cancelDoubleClickTimeout = () => {
		this._clickTimeout = clearTimeout(this._clickTimeout)
		this._clickState = 'idle'
	}
}
