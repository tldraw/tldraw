import { bind } from '@tldraw/utils'
import { elementShouldCaptureKeys, preventDefault } from '../../../utils/dom'
import type { Editor } from '../../Editor'

/**
 * A zero-width space kept inside (and selected within) the keyboard sink. iOS
 * Safari only fires `copy`/`cut` events for Cmd+C / Cmd+X when the focused
 * editable has a non-collapsed selection, and tldraw's clipboard shortcuts
 * ride those native events.
 */
const KEYBOARD_SINK_SENTINEL = '\u200b'

/**
 * A manager for ensuring correct focus across the editor.
 * It will listen for changes in the instance state to make sure the
 * container is focused when the editor is focused.
 * Also, it will make sure that the focus is on things like text
 * labels when the editor is in editing mode.
 *
 * @internal
 */
export class FocusManager {
	private disposeSideEffectListener?: () => void
	private keyboardSink: HTMLElement

	constructor(
		public editor: Editor,
		autoFocus?: boolean
	) {
		this.disposeSideEffectListener = editor.sideEffects.registerAfterChangeHandler(
			'instance',
			(prev, next) => {
				if (prev.isFocused !== next.isFocused) {
					this.updateContainerClass()
				}
			}
		)

		this.keyboardSink = this.createKeyboardSink()

		const currentFocusState = editor.getInstanceState().isFocused
		if (autoFocus !== currentFocusState) {
			editor.updateInstanceState({ isFocused: !!autoFocus })
		}
		this.updateContainerClass()

		const container = editor.getContainer()
		container.addEventListener('focusin', this.handleFocusIn)
		container.addEventListener('pointerdown', this.handleContainerPointerDown)

		const body = editor.getContainerDocument().body
		body.addEventListener('keydown', this.handleKeyDown)
		body.addEventListener('mousedown', this.handleMouseDown)

		// Take DOM focus on mount: keyboard listeners on the document fire
		// either way on desktop, but iOS Safari only delivers Cmd/Ctrl key
		// events when the keyboard sink actually holds focus. Don't steal focus
		// when the surrounding app already focused something — e.g. tldraw.com
		// focuses the file name input right after creating a new file.
		if (autoFocus) {
			const doc = editor.getContainerDocument()
			if (!doc.activeElement || doc.activeElement === doc.body) {
				this.focus()
			}
		}
	}

	/**
	 * iOS Safari only delivers Cmd/Ctrl-modified key events to the page when an
	 * editable element (input, textarea, or contenteditable) holds DOM focus;
	 * with focus on a plain element like the container, Cmd+C / Cmd+V are
	 * silently swallowed. To support hardware-keyboard shortcuts on iPad, the
	 * editor keeps DOM focus on a hidden contenteditable "keyboard sink" inside
	 * the container instead of on the container itself. Because the sink is a
	 * child of the container, its key events bubble through the container and to
	 * the document, so all existing keyboard listeners fire unchanged.
	 *
	 * The sink is marked with `data-tl-keyboard-sink`, which keyboard gates like
	 * `elementShouldCaptureKeys` use to exempt it from "focus is in a text
	 * input" checks. `inputmode="none"` keeps the iOS virtual keyboard from
	 * appearing for touch users, and canceling `beforeinput` keeps typed
	 * characters from accumulating inside it.
	 */
	private createKeyboardSink(): HTMLElement {
		const container = this.editor.getContainer()
		const elm = container.ownerDocument.createElement('div')
		elm.setAttribute('data-tl-keyboard-sink', 'true')
		elm.setAttribute('contenteditable', 'true')
		elm.setAttribute('tabindex', '-1')
		elm.setAttribute('inputmode', 'none')
		elm.setAttribute('autocapitalize', 'off')
		elm.setAttribute('autocorrect', 'off')
		elm.setAttribute('spellcheck', 'false')
		// The sink takes over the container's role in the accessibility tree
		// whenever it holds focus, so mirror the container's role and label.
		elm.setAttribute('role', 'application')
		elm.setAttribute('aria-label', container.getAttribute('aria-label') ?? 'tldraw')
		// Visually hidden via the clip-based "sr-only" recipe. Deliberately NOT
		// `opacity: 0` or `visibility: hidden`: iOS suppresses hardware-keyboard
		// event delivery to editable elements it considers invisible (verified
		// empirically — an `opacity: 0` input receives no key events on iOS
		// Safari, see tldraw/tldraw#9101).
		Object.assign(elm.style, {
			position: 'absolute',
			top: '0px',
			left: '0px',
			width: '1px',
			height: '1px',
			clipPath: 'inset(50%)',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
			pointerEvents: 'none',
			color: 'transparent',
			caretColor: 'transparent',
			outline: 'none',
		})
		elm.textContent = KEYBOARD_SINK_SENTINEL
		elm.addEventListener('beforeinput', preventDefault)
		elm.addEventListener('input', this.handleKeyboardSinkInput)
		elm.addEventListener('focus', this.handleKeyboardSinkFocus)
		elm.addEventListener('copy', this.handleKeyboardSinkCopyCut)
		elm.addEventListener('cut', this.handleKeyboardSinkCopyCut)
		container.appendChild(elm)
		return elm
	}

	/**
	 * Keep the sink's invisible sentinel character selected while the sink has
	 * focus, so the browser generates native `copy`/`cut` events for Cmd+C /
	 * Cmd+X (iOS requires a non-collapsed selection in the focused editable;
	 * see KEYBOARD_SINK_SENTINEL). The sentinel never reaches the clipboard:
	 * the sink suppresses the default copy/cut, and tldraw's own clipboard
	 * handlers write the real payload through the async clipboard API.
	 */
	private selectKeyboardSinkContents() {
		const doc = this.editor.getContainerDocument()
		const selection = doc.getSelection()
		if (!selection) return
		const range = doc.createRange()
		range.selectNodeContents(this.keyboardSink)
		selection.removeAllRanges()
		selection.addRange(range)
	}

	@bind private handleKeyboardSinkFocus() {
		this.selectKeyboardSinkContents()
	}

	@bind private handleKeyboardSinkCopyCut(e: ClipboardEvent) {
		// Suppress the browser's default copy/cut of the sink's sentinel so it
		// can never clobber the user's clipboard. This does not stop the event
		// from bubbling to tldraw's clipboard handlers, which write the real
		// payload themselves when shapes are selected.
		preventDefault(e)
	}

	@bind private handleKeyboardSinkInput() {
		// Belt and braces: beforeinput is canceled, but if anything still lands
		// in the sink (e.g. via an input type a browser doesn't let us cancel),
		// restore the sentinel.
		if (this.keyboardSink.textContent !== KEYBOARD_SINK_SENTINEL) {
			this.keyboardSink.textContent = KEYBOARD_SINK_SENTINEL
			this.selectKeyboardSinkContents()
		}
	}

	/**
	 * While a shape is being edited, keyboard focus belongs to the shape's own
	 * text input, and the sink must not take it. Because the sink is
	 * contenteditable, focusing it also captures the DOM selection, routing
	 * typed characters into the sink (where they are discarded) instead of the
	 * text input. The browser natively moves focus to the container on every
	 * mousedown — including the second mousedown of the double click that
	 * starts a text edit — so without this guard the sink steals the selection
	 * mid-edit and swallows keystrokes.
	 */
	private isEditingShape() {
		return this.editor.getEditingShapeId() !== null
	}

	@bind private handleFocusIn(e: FocusEvent) {
		// The container's own focus (from a canvas click, or the various places
		// that call `getContainer().focus()` to hand keyboard focus back to the
		// canvas) is forwarded to the keyboard sink.
		if (e.target === this.editor.getContainer() && !this.isEditingShape()) {
			this.focus()
		}
	}

	@bind private handleContainerPointerDown(e: PointerEvent) {
		// Hand DOM focus to the keyboard sink on canvas interactions. Desktop
		// browsers focus the container natively on mousedown (which the focusin
		// handler above forwards to the sink), but iOS Safari does not focus
		// non-editable elements on tap, so we do it ourselves. Pointer downs on
		// UI elements and on editable text keep their focus behavior.
		if (this.isEditingShape()) return
		const target = e.target as Element | null
		if (!target?.closest('.tl-canvas')) return
		if (elementShouldCaptureKeys(target)) return
		this.focus()
	}

	/**
	 * The editor's focus state and the container's focus state
	 * are not necessarily always in sync. For that reason we
	 * can't rely on the css `:focus` or `:focus-within` selectors to style the
	 * editor when it is in focus.
	 *
	 * For that reason we synchronize the editor's focus state with a
	 * special class on the container: tl-container__focused
	 */
	private updateContainerClass() {
		const container = this.editor.getContainer()
		const instanceState = this.editor.getInstanceState()

		if (instanceState.isFocused) {
			container.classList.add('tl-container__focused')
		} else {
			container.classList.remove('tl-container__focused')
		}
		container.classList.add('tl-container__no-focus-ring')
	}

	@bind private handleKeyDown(keyEvent: KeyboardEvent) {
		const container = this.editor.getContainer()
		const activeEl = container.ownerDocument.activeElement
		// Edit mode should remove the focus ring, however if the active element's
		// parent is the contextual toolbar, then allow it.
		if (this.editor.getEditingShapeId() && !activeEl?.closest('.tlui-contextual-toolbar')) return
		if (
			(activeEl === container || activeEl === this.keyboardSink) &&
			this.editor.getSelectedShapeIds().length > 0
		) {
			return
		}
		if (['Tab', 'ArrowUp', 'ArrowDown'].includes(keyEvent.key)) {
			container.classList.remove('tl-container__no-focus-ring')
		}
	}

	@bind private handleMouseDown() {
		const container = this.editor.getContainer()
		container.classList.add('tl-container__no-focus-ring')
	}

	focus() {
		if (this.isEditingShape()) {
			// Keep pre-sink behavior while a shape is being edited: focusing the
			// contenteditable sink would steal the DOM selection from the
			// shape's text input.
			this.editor.getContainer().focus()
			return
		}
		this.keyboardSink.focus({ preventScroll: true })
	}

	blur({ blurContainer = true } = {}) {
		this.editor.complete() // stop any interaction
		if (blurContainer) {
			const container = this.editor.getContainer()
			if (container.ownerDocument.activeElement === this.keyboardSink) {
				this.keyboardSink.blur()
			}
			container.blur() // blur the container
		}
	}

	dispose() {
		const container = this.editor.getContainer()
		container.removeEventListener('focusin', this.handleFocusIn)
		container.removeEventListener('pointerdown', this.handleContainerPointerDown)
		this.keyboardSink.remove()
		const body = this.editor.getContainerDocument().body
		body.removeEventListener('keydown', this.handleKeyDown)
		body.removeEventListener('mousedown', this.handleMouseDown)
		this.disposeSideEffectListener?.()
	}
}
