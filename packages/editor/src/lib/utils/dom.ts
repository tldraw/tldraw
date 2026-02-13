/*
This is used to facilitate double clicking and pointer capture on elements.

The events in this file are possibly set on individual SVG elements, 
such as handles or corner handles, rather than on HTML elements or 
SVGSVGElements. Raw SVG elemnets do not support pointerCapture in 
most cases, meaning that in order for pointer capture to work, we 
need to crawl up the DOM tree to find the nearest HTML element. Then,
in order for that element to also call the `onPointerUp` event from
this file, we need to manually set that event on that element and
later remove it when the pointerup occurs. This is a potential leak
if the user clicks on a handle but the pointerup does not fire for
whatever reason.
*/

import React from 'react'
import { debugFlags, pointerCaptureTrackingObject } from './debug-flags'

/** @public */
export function loopToHtmlElement(elm: Element): HTMLElement {
	if (elm.nodeType === Node.ELEMENT_NODE) return elm as HTMLElement
	if (elm.parentElement) return loopToHtmlElement(elm.parentElement)
	else throw Error('Could not find a parent element of an HTML type!')
}

/**
 * This function calls `event.preventDefault()` for you. Why is that useful?
 *
 * Beacuase if you enable `window.preventDefaultLogging = true` it'll log out a message when it
 * happens. Because we use console.warn rather than (log) you'll get a stack trace in the inspector
 * telling you exactly where it happened. This is important because `e.preventDefault()` is the
 * source of many bugs, but unfortuantly it can't be avoided because it also stops a lot of default
 * behaviour which doesn't make sense in our UI
 *
 * @param event - To prevent default on
 * @public
 */
export function preventDefault(event: React.BaseSyntheticEvent | Event) {
	event.preventDefault()
	if (debugFlags.logPreventDefaults.get()) {
		console.warn('preventDefault called on event:', event)
	}
}

/** @public */
export function setPointerCapture(
	element: Element,
	event: React.PointerEvent<Element> | PointerEvent
) {
	element.setPointerCapture(event.pointerId)
	if (debugFlags.logPointerCaptures.get()) {
		const trackingObj = pointerCaptureTrackingObject.get()
		trackingObj.set(element, (trackingObj.get(element) ?? 0) + 1)
		console.warn('setPointerCapture called on element:', element, event)
	}
}

/** @public */
export function releasePointerCapture(
	element: Element,
	event: React.PointerEvent<Element> | PointerEvent
) {
	if (!element.hasPointerCapture(event.pointerId)) {
		return
	}

	element.releasePointerCapture(event.pointerId)
	if (debugFlags.logPointerCaptures.get()) {
		const trackingObj = pointerCaptureTrackingObject.get()
		if (trackingObj.get(element) === 1) {
			trackingObj.delete(element)
		} else if (trackingObj.has(element)) {
			trackingObj.set(element, trackingObj.get(element)! - 1)
		} else {
			console.warn('Release without capture')
		}
		console.warn('releasePointerCapture called on element:', element, event)
	}
}

/**
 * Calls `event.stopPropagation()`.
 *
 * @deprecated Use {@link Editor.markEventAsHandled} instead, or manually call `event.stopPropagation()` if
 * that's what you really want.
 *
 * @public
 */
export const stopEventPropagation = (e: any) => e.stopPropagation()

/** @internal */
export const setStyleProperty = (
	elm: HTMLElement | null,
	property: string,
	value: string | number
) => {
	if (!elm) return
	elm.style.setProperty(property, value as string)
}

/** @internal */
export function activeElementShouldCaptureKeys(allowButtons = false) {
	const { activeElement } = document
	const elements = allowButtons ? ['input', 'textarea'] : ['input', 'select', 'button', 'textarea']
	return !!(
		activeElement &&
		((activeElement as HTMLElement).isContentEditable ||
			elements.indexOf(activeElement.tagName.toLowerCase()) > -1 ||
			activeElement.classList.contains('tlui-slider__thumb'))
	)
}
