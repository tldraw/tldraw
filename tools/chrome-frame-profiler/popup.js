const $ = (id) => document.getElementById(id)

let currentTabId = null
let lastProfile = null

// ---- Init ----
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
	currentTabId = tab?.id
	refreshStatus()
})

// ---- UI bindings ----
$('attachBtn').addEventListener('click', async () => {
	const resp = await send({ type: 'attach', tabId: currentTabId })
	if (resp.ok) refreshStatus()
})

$('detachBtn').addEventListener('click', async () => {
	await send({ type: 'detach' })
	refreshStatus()
})

$('captureFrameBtn').addEventListener('click', () => capture('capture-frame'))
$('capture100Btn').addEventListener('click', () => capture('capture-duration', 100))
$('capture500Btn').addEventListener('click', () => capture('capture-duration', 500))

$('delay3Btn').addEventListener('click', () => captureDelayed(3, 'frame'))
$('delay5Btn').addEventListener('click', () => captureDelayed(5, 'frame'))
$('delay5d500Btn').addEventListener('click', () => captureDelayed(5, 'duration', 500))
$('cancelBtn').addEventListener('click', async () => {
	await send({ type: 'cancel-countdown' })
	setCountdown(0)
})

$('downloadBtn').addEventListener('click', () => {
	if (!lastProfile) return
	const blob = new Blob([JSON.stringify(lastProfile)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `frame-${Date.now()}.cpuprofile`
	a.click()
	URL.revokeObjectURL(url)
})

$('copyBtn').addEventListener('click', () => {
	const text = $('summary').textContent
	navigator.clipboard.writeText(text)
	$('copyBtn').textContent = 'Copied!'
	setTimeout(() => ($('copyBtn').textContent = 'Copy summary'), 1500)
})

// ---- Capture ----
async function capture(type, duration) {
	setCapturing(true)
	const msg =
		type === 'capture-frame'
			? { type: 'capture-frame', tabId: currentTabId }
			: { type: 'capture-duration', tabId: currentTabId, duration }
	const resp = await send(msg)
	setCapturing(false)

	if (resp.profile) {
		lastProfile = resp.profile
		showSummary(resp.profile)
		$('downloadBtn').disabled = false
		$('copyBtn').disabled = false
	}
}

async function captureDelayed(delaySec, captureType, duration) {
	setCountdown(delaySec)

	// Fire-and-forget: the background worker owns the countdown + capture.
	// The popup may close while the user interacts with the page, so we
	// don't await the response. Results are picked up via refreshStatus
	// when the popup is reopened.
	send({
		type: 'capture-delayed',
		tabId: currentTabId,
		delay: delaySec,
		captureType,
		duration,
	})
}

function setCountdown(remaining) {
	const row = $('countdownRow')
	if (remaining > 0) {
		row.style.display = 'flex'
		$('countdownText').textContent = remaining
	} else {
		row.style.display = 'none'
	}
}

// ---- Summary ----
function showSummary(profile) {
	if (!profile || !profile.nodes) return
	const { nodes, samples, timeDeltas } = profile

	// Build a map of node id -> node
	const nodeMap = new Map()
	for (const node of nodes) {
		nodeMap.set(node.id, node)
	}

	// Accumulate self-time per node from samples
	const selfTime = new Map()
	for (let i = 0; i < samples.length; i++) {
		const id = samples[i]
		const dt = timeDeltas[i] || 0
		selfTime.set(id, (selfTime.get(id) || 0) + dt)
	}

	// Wall-clock duration and busy (non-idle) time
	const wallUs = timeDeltas.reduce((a, b) => a + b, 0)
	const wallMs = (wallUs / 1000).toFixed(1)

	// Identify idle/root/program node IDs
	const idleNodeIds = new Set()
	for (const node of nodes) {
		const fn = node.callFrame.functionName
		if (fn === '(idle)' || fn === '(root)' || fn === '(program)') {
			idleNodeIds.add(node.id)
		}
	}

	// Compute busy time (exclude idle/root/program samples)
	let busyUs = 0
	for (let i = 0; i < samples.length; i++) {
		if (!idleNodeIds.has(samples[i])) {
			busyUs += timeDeltas[i] || 0
		}
	}
	const busyMs = (busyUs / 1000).toFixed(1)

	// Sort by self-time descending
	const entries = [...selfTime.entries()]
		.map(([id, us]) => {
			const node = nodeMap.get(id)
			const cf = node.callFrame
			return { us, fn: cf.functionName || '(anonymous)', url: cf.url, line: cf.lineNumber + 1 }
		})
		.filter((e) => e.fn !== '(idle)' && e.fn !== '(root)' && e.fn !== '(program)')
		.sort((a, b) => b.us - a.us)

	// Format
	const lines = [`Wall: ${wallMs}ms  |  Busy: ${busyMs}ms  |  Samples: ${samples.length}`, '']
	const top = entries.slice(0, 30)
	const maxFnLen = Math.max(...top.map((e) => e.fn.length), 8)

	for (const e of top) {
		const ms = (e.us / 1000).toFixed(1).padStart(7)
		const pct = ((e.us / busyUs) * 100).toFixed(0).padStart(3)
		const fn = e.fn.padEnd(maxFnLen)
		// Shorten URL to just filename
		const file = e.url ? e.url.split('/').pop().split('?')[0] : ''
		const loc = file ? `${file}:${e.line}` : ''
		lines.push(`${ms}ms ${pct}% ${fn}  ${loc}`)
	}

	if (entries.length > 30) {
		lines.push(`\n... and ${entries.length - 30} more functions`)
	}

	const text = lines.join('\n')
	$('summary').textContent = text
	$('summary').style.display = 'block'
}

// ---- Status ----
async function refreshStatus() {
	const resp = await send({ type: 'get-status' })
	if (!resp) return
	const attached = resp.attached
	$('dot').className = `dot ${attached ? 'on' : 'off'}`
	$('statusText').textContent = attached ? 'Attached' : 'Not attached'
	$('attachBtn').disabled = attached
	$('detachBtn').disabled = !attached
	$('captureFrameBtn').disabled = !attached
	$('capture100Btn').disabled = !attached
	$('capture500Btn').disabled = !attached
	$('delay3Btn').disabled = !attached
	$('delay5Btn').disabled = !attached
	$('delay5d500Btn').disabled = !attached

	if (resp.countdownRemaining > 0) {
		setCountdown(resp.countdownRemaining)
	}

	if (resp.hasProfile) {
		const profileResp = await send({ type: 'get-last-profile' })
		if (profileResp?.profile) {
			lastProfile = profileResp.profile
			showSummary(profileResp.profile)
			$('downloadBtn').disabled = false
			$('copyBtn').disabled = false
		}
	}
}

function setCapturing(on) {
	$('captureFrameBtn').disabled = on
	$('capture100Btn').disabled = on
	$('capture500Btn').disabled = on
	$('statusText').textContent = on ? 'Capturing...' : 'Attached'
}

function send(msg) {
	return chrome.runtime.sendMessage(msg)
}
