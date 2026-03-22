/** @typedef {{ tabId: number }} Target */

/** @type {Target | null} */
let attachedTarget = null
/** @type {object | null} */
let lastProfile = null
let isCapturing = false
let countdownTimer = null
let countdownRemaining = 0

// ---- Keyboard shortcut ----
chrome.commands.onCommand.addListener(async (command) => {
	if (command === 'capture-frame') {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (!tab) return
		const profile = await captureFrame(tab.id)
		if (profile) {
			chrome.action.setBadgeText({ text: '1' })
			chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' })
		}
	}
})

// ---- Messages from popup ----
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === 'attach') {
		attach(msg.tabId).then((ok) => sendResponse({ ok }))
		return true
	}
	if (msg.type === 'detach') {
		detach().then((ok) => sendResponse({ ok }))
		return true
	}
	if (msg.type === 'capture-frame') {
		captureFrame(msg.tabId).then((profile) => sendResponse({ profile }))
		return true
	}
	if (msg.type === 'capture-duration') {
		captureDuration(msg.tabId, msg.duration).then((profile) => sendResponse({ profile }))
		return true
	}
	if (msg.type === 'capture-delayed') {
		startCountdown(msg.tabId, msg.delay, msg.captureType, msg.duration).then((profile) =>
			sendResponse({ profile })
		)
		return true
	}
	if (msg.type === 'cancel-countdown') {
		cancelCountdown()
		sendResponse({ ok: true })
		return
	}
	if (msg.type === 'get-status') {
		sendResponse({
			attached: attachedTarget !== null,
			hasProfile: lastProfile !== null,
			isCapturing,
			countdownRemaining,
		})
		return
	}
	if (msg.type === 'get-last-profile') {
		sendResponse({ profile: lastProfile })
		return
	}
})

// Clean up if the debugger detaches unexpectedly
chrome.debugger.onDetach.addListener((_source, _reason) => {
	attachedTarget = null
})

// ---- Core logic ----

async function attach(tabId) {
	if (attachedTarget) return true
	try {
		const target = { tabId }
		await chrome.debugger.attach(target, '1.3')
		await chrome.debugger.sendCommand(target, 'Profiler.enable')
		// 100 microsecond sampling for high resolution
		await chrome.debugger.sendCommand(target, 'Profiler.setSamplingInterval', { interval: 100 })
		attachedTarget = target
		return true
	} catch (e) {
		console.error('Attach failed:', e)
		return false
	}
}

async function detach() {
	if (!attachedTarget) return true
	try {
		await chrome.debugger.sendCommand(attachedTarget, 'Profiler.disable')
		await chrome.debugger.detach(attachedTarget)
		attachedTarget = null
		return true
	} catch (e) {
		console.error('Detach failed:', e)
		attachedTarget = null
		return false
	}
}

async function ensureAttached(tabId) {
	if (attachedTarget && attachedTarget.tabId === tabId) return true
	if (attachedTarget) await detach()
	return attach(tabId)
}

async function captureFrame(tabId) {
	if (isCapturing) return null
	isCapturing = true
	try {
		if (!(await ensureAttached(tabId))) return null
		const target = attachedTarget

		await chrome.debugger.sendCommand(target, 'Profiler.start')

		// Wait for one complete frame:
		// First rAF fires at the start of the next frame.
		// Second rAF fires at the start of the frame after — so we've
		// captured all the work that happened in between.
		await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
			expression:
				'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
			awaitPromise: true,
		})

		const result = await chrome.debugger.sendCommand(target, 'Profiler.stop')
		lastProfile = result.profile
		return lastProfile
	} catch (e) {
		console.error('Capture failed:', e)
		return null
	} finally {
		isCapturing = false
	}
}

function cancelCountdown() {
	if (countdownTimer) {
		clearInterval(countdownTimer)
		countdownTimer = null
	}
	countdownRemaining = 0
	chrome.action.setBadgeText({ text: '' })
}

async function startCountdown(tabId, delaySec, captureType, duration) {
	// Ensure attached before starting countdown so the debugger banner
	// is already visible and we don't waste countdown time attaching.
	if (!(await ensureAttached(tabId))) return null

	countdownRemaining = delaySec
	chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' })
	chrome.action.setBadgeText({ text: String(countdownRemaining) })

	return new Promise((resolve) => {
		countdownTimer = setInterval(async () => {
			countdownRemaining--
			if (countdownRemaining > 0) {
				chrome.action.setBadgeText({ text: String(countdownRemaining) })
				return
			}

			clearInterval(countdownTimer)
			countdownTimer = null
			chrome.action.setBadgeText({ text: '...' })

			let profile
			if (captureType === 'frame') {
				profile = await captureFrame(tabId)
			} else {
				profile = await captureDuration(tabId, duration || 100)
			}

			if (profile) {
				chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' })
				chrome.action.setBadgeText({ text: '!' })
			} else {
				chrome.action.setBadgeText({ text: '' })
			}
			countdownRemaining = 0
			resolve(profile)
		}, 1000)
	})
}

async function captureDuration(tabId, durationMs) {
	if (isCapturing) return null
	isCapturing = true
	try {
		if (!(await ensureAttached(tabId))) return null
		const target = attachedTarget

		await chrome.debugger.sendCommand(target, 'Profiler.start')
		await new Promise((r) => setTimeout(r, durationMs))
		const result = await chrome.debugger.sendCommand(target, 'Profiler.stop')
		lastProfile = result.profile
		return lastProfile
	} catch (e) {
		console.error('Capture failed:', e)
		return null
	} finally {
		isCapturing = false
	}
}
