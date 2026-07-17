// build.mjs — Generate index.html for a PR walkthrough video from a manifest
// JSON file. Reads slide definitions and emits one HTML composition with
// timed clips + a single GSAP timeline driving slide transitions, code-focus
// pans, and yellow-on-black captions sourced from whisper word-level
// transcripts of each audio file.
//
// Usage:
//   node build.mjs <path-to-manifest.json>
//
// Expects:
//   - audio-NN.wav files alongside the manifest (referenced by slide.audio)
//   - copies of those files in ./assets/audio-NN.wav (done by render.sh)
//   - whisper transcripts in ./transcripts/audio-NN.json (done by render.sh)
//
// Output: ./index.html (the hyperframes composition)

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

// --- Args --------------------------------------------------------------------

const manifestPath = process.argv[2]
if (!manifestPath) {
	console.error('Usage: node build.mjs <path-to-manifest.json>')
	process.exit(1)
}
const manifestAbs = path.resolve(manifestPath)
if (!fs.existsSync(manifestAbs)) {
	console.error(`Manifest not found: ${manifestAbs}`)
	process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8'))

// --- Whisper transcripts -----------------------------------------------------

const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts')
const transcripts = new Map()
if (fs.existsSync(TRANSCRIPTS_DIR)) {
	for (const f of fs.readdirSync(TRANSCRIPTS_DIR)) {
		if (!f.endsWith('.json')) continue
		const audioName = f.replace(/\.json$/, '.wav')
		transcripts.set(audioName, JSON.parse(fs.readFileSync(path.join(TRANSCRIPTS_DIR, f), 'utf8')))
	}
}

// Group whisper words into caption-sized chunks. Break early on long pauses
// (sentence boundaries) or when reaching the max word count.
function chunkTranscript(words, { maxWords = 7, gapThreshold = 0.45 } = {}) {
	const chunks = []
	let current = []
	for (const w of words) {
		if (current.length === 0) {
			current.push(w)
			continue
		}
		const prev = current[current.length - 1]
		const gap = w.start - prev.end
		if (gap > gapThreshold || current.length >= maxWords) {
			chunks.push(current)
			current = [w]
		} else {
			current.push(w)
		}
	}
	if (current.length) chunks.push(current)
	return chunks.map((group) => ({
		text: group.map((g) => g.text).join(' '),
		start: group[0].start,
		end: group[group.length - 1].end,
	}))
}

function makeCaptions(audioFile, audioStart) {
	const words = transcripts.get(audioFile)
	if (!words) return []
	const chunks = chunkTranscript(words)
	// Whisper capitalizes the first word of each transcript naturally and
	// leaves mid-sentence words lowercase — so we use the text as-is rather
	// than uppercasing each chunk (which would treat every chunk as a new
	// sentence).
	return chunks.map((c) => ({
		text: c.text,
		start: audioStart + c.start,
		duration: Math.max(0.4, c.end - c.start),
	}))
}

// --- Cumulative timing -------------------------------------------------------

let cursor = 0
const timed = manifest.slides.map((slide, i) => {
	const start = cursor
	const duration = slide.durationInSeconds
	cursor += duration
	return { slide, start, duration, i }
})
const totalDuration = cursor

// --- HTML escape -------------------------------------------------------------

function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// --- Light syntax highlighting (keywords / strings / comments / etc) ---------

const KEYWORDS = new Set([
	'abstract',
	'as',
	'async',
	'await',
	'boolean',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'constructor',
	'continue',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'from',
	'function',
	'get',
	'if',
	'implements',
	'import',
	'in',
	'instanceof',
	'interface',
	'is',
	'let',
	'new',
	'null',
	'number',
	'of',
	'override',
	'private',
	'protected',
	'public',
	'readonly',
	'return',
	'set',
	'static',
	'string',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'type',
	'typeof',
	'undefined',
	'void',
	'while',
	'yield',
	'any',
	'never',
	'unknown',
])

function highlightLine(line) {
	const re =
		/(\/\/.*$)|(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*')|("(?:\\.|[^"\\])*")|(`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)|(@\w+)/g
	let out = ''
	let last = 0
	for (const m of line.matchAll(re)) {
		out += esc(line.slice(last, m.index))
		const [tok, comment, block, sq, dq, bt, num, ident, decorator] = m
		if (comment || block) out += `<span class="t-c">${esc(tok)}</span>`
		else if (sq || dq || bt) out += `<span class="t-s">${esc(tok)}</span>`
		else if (num) out += `<span class="t-n">${esc(tok)}</span>`
		else if (decorator) out += `<span class="t-d">${esc(tok)}</span>`
		else if (ident) {
			if (KEYWORDS.has(ident)) out += `<span class="t-k">${esc(ident)}</span>`
			else if (/^[A-Z]/.test(ident)) out += `<span class="t-t">${esc(ident)}</span>`
			else out += esc(ident)
		}
		last = m.index + tok.length
	}
	out += esc(line.slice(last))
	return out || '&nbsp;'
}

// --- Brand SVGs --------------------------------------------------------------

const TLDRAW_WORDMARK = `<svg viewBox="0 0 4081 1000" xmlns="http://www.w3.org/2000/svg" class="wordmark"><path d="M1303.69 270.972C1303.69 240.816 1328.13 216.369 1358.29 216.369H1428.49C1458.65 216.369 1483.09 240.816 1483.09 270.972V315.954C1483.09 327.011 1492.06 335.975 1503.12 335.975H1541C1561.11 335.975 1577.4 352.272 1577.4 372.376V429.579C1577.4 449.683 1561.11 465.98 1541 465.98H1503.12C1492.06 465.98 1483.09 474.944 1483.09 486.001V674.64C1483.09 681.573 1484.29 687.424 1486.67 692.19C1489.05 696.741 1492.74 700.207 1497.72 702.591C1502.7 704.758 1522.56 705.841 1530.37 705.841C1549.5 705.841 1560.72 712.765 1564.67 731.492L1577.4 791.954C1581.54 811.61 1569.85 830.984 1550.28 835.522C1535.55 838.989 1511.26 841.264 1490.9 842.347C1449.73 844.514 1415.17 840.289 1387.22 829.672C1359.26 818.838 1338.25 801.829 1324.16 778.644C1310.08 755.46 1303.25 726.425 1303.69 691.54V486.001C1303.69 474.944 1294.72 465.98 1283.67 465.98H1266.96C1246.85 465.98 1230.56 449.683 1230.56 429.579V372.376C1230.56 352.272 1246.85 335.975 1266.96 335.975H1283.67C1294.72 335.975 1303.69 327.011 1303.69 315.954V270.972Z" fill="currentColor"/><path d="M1974.54 814.96C1944.85 796.326 1921.02 768.049 1903.03 730.131C1885.27 692.213 1876.38 644.436 1876.38 586.8C1876.38 501.729 1898.19 403.692 1977.14 357.015C2038.76 320.844 2119.52 320.677 2175.17 368.834C2185.85 378.077 2214.4 369.799 2214.4 355.676V225.384C2214.4 195.228 2238.84 170.781 2269 170.781H2339.2C2369.36 170.781 2393.81 195.228 2393.81 225.384V781.808C2393.81 811.964 2369.36 836.411 2339.2 836.411H2249.9C2231.01 836.411 2215.7 821.099 2215.7 802.211C2215.7 791.902 2195.36 785.728 2188.33 793.263C2186.18 795.558 2184.03 797.807 2181.9 800.009C2128.34 855.383 2037.25 854.041 1974.54 814.96ZM2218.3 586.8C2218.3 537.286 2200.48 468.495 2138.99 468.495C2077.29 468.495 2060.99 537.551 2060.99 586.8C2060.99 623.113 2066.97 666.411 2096.74 691.13C2165.89 746.195 2218.3 647.886 2218.3 586.8Z" fill="currentColor"/><path d="M2513.66 836.412C2483.51 836.412 2459.06 811.965 2459.06 781.809V391.792C2459.06 361.636 2483.51 337.19 2513.66 337.19H2603.2C2619.81 337.19 2633.27 350.651 2633.27 367.256C2633.27 382.997 2638.97 387.954 2649.77 387.954C2668.35 387.954 2672.24 328.627 2758.31 330.689C2813.1 330.689 2820.44 385.406 2820.44 412.863C2820.44 475.557 2800.52 481.496 2737.51 481.496C2681.18 481.496 2638.47 519.992 2638.47 576.4V781.809C2638.47 811.965 2614.02 836.412 2583.87 836.412H2513.66Z" fill="currentColor"/><path d="M2970.68 842.913C2916.63 842.913 2859.79 826.876 2828.98 779.21C2815.11 757.759 2808.18 730.458 2808.18 697.306C2808.18 651.927 2823.66 607.404 2861.15 579.651C2898.44 552.053 2946.07 542.134 2991.49 538.699C3020.52 536.448 3107.19 538.281 3107.19 494.497C3107.19 448.71 3041.54 443.568 3011.96 464.271C2970.82 492.82 2973.83 498.397 2910.23 498.397C2834.58 498.397 2857.58 387.482 2932.33 352.791C2965.48 337.19 3006.87 329.39 3056.49 329.39C3114.93 329.39 3177.44 341.047 3225.17 376.842C3245.1 391.576 3260.27 408.91 3270.67 428.844C3281.29 448.562 3286.6 470.013 3286.6 493.197V780.51C3286.6 810.666 3262.15 835.112 3232 835.112H3152.37C3133.88 835.112 3118.89 820.125 3118.89 801.638C3118.89 792.06 3103.8 787.48 3097.15 794.364C3063.59 829.054 3017.92 842.913 2970.68 842.913ZM3097.11 696.981C3108 681.743 3109.4 662.66 3109.14 643.805C3108.97 630.868 3095.3 621.942 3082.84 625.429C3067.81 629.638 3052.39 632.57 3036.99 634.904C3017.05 638.018 2994.44 645.215 2983.36 663.505C2973.07 680.83 2975.13 706.154 2991.81 718.757C3023.43 742.651 3075.6 727.106 3097.11 696.981Z" fill="currentColor"/><path d="M1761.82 163C1792.33 163 1817.06 187.732 1817.06 218.24V781.158C1817.06 811.666 1792.33 836.398 1761.82 836.398H1690.8C1660.29 836.398 1635.56 811.666 1635.56 781.158V218.24C1635.56 187.732 1660.29 163 1690.8 163H1761.82Z" fill="currentColor"/><path d="M3480.44 836.409C3455.39 836.409 3433.55 819.357 3427.47 795.049L3329.98 405.032C3321.37 370.57 3347.43 337.187 3382.95 337.187H3447.12C3473.38 337.187 3495.92 355.886 3500.78 381.699L3534.84 562.897C3538.14 580.407 3563.06 580.816 3566.93 563.423L3607.7 379.944C3613.25 354.961 3635.4 337.187 3660.99 337.187H3748.03C3773.42 337.187 3795.45 354.684 3801.21 379.411L3843.62 561.638C3847.65 578.962 3872.52 578.345 3875.69 560.842L3908.05 382.062C3912.75 356.08 3935.37 337.187 3961.77 337.187H4025.63C4061.15 337.187 4087.21 370.57 4078.6 405.032L3981.11 795.049C3975.03 819.357 3953.19 836.409 3928.14 836.409H3818.64C3794.09 836.409 3772.56 820.015 3766.02 796.343L3719.13 626.567C3714.69 610.471 3691.83 610.567 3687.52 626.7L3642.32 795.901C3635.94 819.79 3614.3 836.409 3589.57 836.409H3480.44Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0.557373 130C0.557373 58 58.5574 0 130.557 0H870.557C942.557 0 1000.56 58 1000.56 130V870C1000.56 942 942.557 1000 870.557 1000H130.557C58.5574 1000 0.557373 942 0.557373 870V130ZM590.557 300C590.557 350 550.557 390 500.557 390C450.557 390 410.557 350 410.557 300C410.557 250 450.557 210 500.557 210C550.557 210 590.557 250 590.557 300ZM470.557 810C513.557 810 554.557 751 569.557 719C588.557 678 599.557 605 580.557 562C567.557 532 537.557 510 497.557 510C449.557 510 410.557 549 410.557 597C410.557 640 441.557 674 481.557 681C483.557 681 485.557 684 485.557 686C481.557 711 470.557 743 453.557 759C432.557 779 438.557 810 470.557 810Z" fill="currentColor"/></svg>`

const TLDRAW_MARK = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" class="mark"><rect x="0.5" y="0.5" width="31" height="31" rx="3" fill="currentColor"/><path d="M18.6413 9.15203C18.6413 9.92538 18.377 10.5816 17.8484 11.1206C17.3197 11.6596 16.6761 11.9291 15.9176 11.9291C15.1362 11.9291 14.4811 11.6596 13.9524 11.1206C13.4238 10.5816 13.1595 9.92538 13.1595 9.15203C13.1595 8.37868 13.4238 7.7225 13.9524 7.1835C14.4811 6.6445 15.1362 6.375 15.9176 6.375C16.6761 6.375 17.3197 6.6445 17.8484 7.1835C18.377 7.7225 18.6413 8.37868 18.6413 9.15203ZM13.125 18.8843C13.125 18.1109 13.3893 17.4548 13.918 16.9158C14.4696 16.3533 15.1362 16.0721 15.9176 16.0721C16.6531 16.0721 17.2967 16.3533 17.8484 16.9158C18.4 17.4548 18.7218 18.0641 18.8137 18.7437C18.9976 20.0092 18.7677 21.2629 18.1242 22.505C17.5036 23.747 16.6072 24.6961 15.435 25.3523C14.7914 25.7273 14.2627 25.7155 13.849 25.3172C13.4583 24.9422 13.5732 24.4969 14.1938 23.9814C14.5386 23.7236 14.8259 23.3955 15.0557 22.9971C15.2856 22.5987 15.435 22.1886 15.5039 21.7668C15.5269 21.5793 15.4465 21.4856 15.2626 21.4856C14.8029 21.4621 14.3317 21.2043 13.849 20.7122C13.3663 20.2201 13.125 19.6108 13.125 18.8843Z" fill="#ffffff"/></svg>`

// --- Slide renderers ---------------------------------------------------------

function slideAttrs({ start, duration, i }, extra = '') {
	// Slide 0 starts visible at frame 0; the .slide CSS baseline is opacity:0
	// so without this override the captured first frame would be blank.
	const initialStyle = i === 0 ? ` style="opacity: 1"` : ''
	return `class="clip slide" data-start="${start}" data-duration="${duration}" data-track-index="2" id="slide-${i}"${initialStyle} ${extra}`
}

function renderIntro({ slide, start, duration, i }) {
	// Pick a single word from the title to highlight with the brand mark
	// background. Defaults to the last word if no special marker is provided.
	const title = slide.title || `PR #${manifest.pr}`
	// Strip a trailing "#NNNN" if present — it's redundant with the eyebrow.
	const cleanTitle = title.replace(/\s*#\d+\s*$/, '').trim()
	const words = cleanTitle.split(/\s+/)
	const highlightIndex = Math.max(0, words.length - 2)
	const highlighted = words
		.map((w, n) => (n === highlightIndex ? `<span class="special">${esc(w)}</span>` : esc(w)))
		.join(' ')

	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--intro">
		<div class="eyebrow">
			<span class="pill">Pull Request</span>
			<span>tldraw / tldraw &middot; #${manifest.pr}</span>
		</div>
		<h1 class="title-xl">${highlighted}</h1>
		${slide.subtitle ? `<p class="subtitle-lg">${esc(slide.subtitle)}</p>` : ''}
		<div class="meta-row">
			${slide.date ? `<span>${esc(slide.date)}</span><span class="dot"></span>` : ''}
			<span>Walkthrough</span>
		</div>
	</div>
</div>`
}

function renderSegment({ slide, start, duration, i }) {
	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--segment">
		<div class="seg-rule"></div>
		<h2 class="title-segment">${esc(slide.title || '')}</h2>
		<div class="seg-rule"></div>
	</div>
</div>`
}

function renderCode({ slide, start, duration, i }) {
	const lines = (slide.code || '').split('\n')
	const focus = slide.focus || [{ line: 0, at: 0 }]
	const codeLines = lines
		.map(
			(l, n) =>
				`<div class="cl" data-line="${n}"><span class="ln">${String(n + 1).padStart(2, ' ')}</span><span class="lc">${highlightLine(l)}</span></div>`
		)
		.join('')
	const focusJson = JSON.stringify(focus)
	return `
<div ${slideAttrs({ start, duration, i }, `data-focus='${focusJson}' data-kind="code"`)}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--code">
		<div class="file-bar">
			<span class="lang-badge">${esc(slide.language || 'ts')}</span>
			<span class="file-name">${esc(slide.filename || '')}</span>
			<span class="slide-title">${esc(slide.title || '')}</span>
		</div>
		<div class="code-viewport">
			<div class="code-scroller" id="code-scroll-${i}">
				${codeLines}
			</div>
			<div class="code-fade code-fade--top"></div>
			<div class="code-fade code-fade--bottom"></div>
		</div>
	</div>
</div>`
}

function renderDiffLines(diff) {
	const lines = diff.split('\n')
	return lines
		.map((l) => {
			let cls = 'dl'
			let mark = ''
			if (l.startsWith('@@')) {
				cls += ' dl-hunk'
				mark = '⋯'
			} else if (l.startsWith('+++') || l.startsWith('---')) {
				cls += ' dl-meta'
			} else if (l.startsWith('+')) {
				cls += ' dl-add'
				mark = '+'
			} else if (l.startsWith('-')) {
				cls += ' dl-del'
				mark = '−'
			} else {
				mark = ' '
			}
			const body = l.startsWith('+') || l.startsWith('-') ? l.slice(1) : l
			return `<div class="${cls}"><span class="dm">${esc(mark)}</span><span class="dc">${highlightLine(body)}</span></div>`
		})
		.join('')
}

function renderDiff({ slide, start, duration, i }) {
	return `
<div ${slideAttrs({ start, duration, i }, `data-kind="diff"`)}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--code">
		<div class="file-bar">
			<span class="lang-badge">${esc(slide.language || 'ts')}</span>
			<span class="file-name">${esc(slide.filename || '')}</span>
			<span class="slide-title">${esc(slide.title || '')}</span>
		</div>
		<div class="code-viewport">
			<div class="code-scroller" id="code-scroll-${i}">
				${renderDiffLines(slide.diff || '')}
			</div>
			<div class="code-fade code-fade--top"></div>
			<div class="code-fade code-fade--bottom"></div>
		</div>
	</div>
</div>`
}

function renderText({ slide, start, duration, i }) {
	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--intro">
		<div class="eyebrow">
			<span class="pill">Summary</span>
			<span>tldraw / tldraw &middot; #${manifest.pr}</span>
		</div>
		<h1 class="title-xl">${esc(slide.title || '')}</h1>
		${slide.subtitle ? `<p class="subtitle-lg">${esc(slide.subtitle)}</p>` : ''}
	</div>
</div>`
}

function renderList({ slide, start, duration, i }) {
	const items = (slide.items || [])
		.map(
			(it, n) =>
				`<li class="list-item"><span class="list-num">${n + 1}.</span><span>${esc(it)}</span></li>`
		)
		.join('')
	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--list">
		<h2 class="title-list">${esc(slide.title || '')}</h2>
		<ol class="list-items">${items}</ol>
	</div>
</div>`
}

function renderImage({ slide, start, duration, i }) {
	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--image">
		<img class="image-fill" src="assets/${esc(slide.src || '')}" alt=""/>
	</div>
</div>`
}

function renderOutro({ start, duration, i }) {
	return `
<div ${slideAttrs({ start, duration, i })}>
	<div class="slide-bg"></div>
	<div class="slide-stage stage--outro">
		<div class="brand-big">${TLDRAW_WORDMARK}</div>
		<div class="outro-meta">PR Walkthrough &middot; #${manifest.pr}</div>
	</div>
</div>`
}

const RENDERERS = {
	intro: renderIntro,
	segment: renderSegment,
	code: renderCode,
	diff: renderDiff,
	text: renderText,
	list: renderList,
	image: renderImage,
	outro: renderOutro,
}

const slidesHtml = timed
	.map((t) => {
		const r = RENDERERS[t.slide.type]
		if (!r) throw new Error(`Unknown slide type: ${t.slide.type}`)
		return r(t)
	})
	.join('')

// --- Audio elements ----------------------------------------------------------

const audioHtml = timed
	.filter(({ slide }) => slide.audio)
	.map(
		({ slide, start, i }) =>
			`<audio class="clip" data-start="${start}" data-duration="${slide.durationInSeconds}" data-track-index="100" data-volume="1" src="assets/${slide.audio}" id="audio-${i}"></audio>`
	)
	.join('\n')

// --- Captions ---------------------------------------------------------------

const allCaptions = []
for (const { slide, start } of timed) {
	if (!slide.audio) continue
	const caps = makeCaptions(slide.audio, start)
	allCaptions.push(...caps)
}

const CAPTION_GAP = 0.002
const captionsHtml = allCaptions
	.map((c, k) => {
		const dur = Math.max(0.05, c.duration - CAPTION_GAP)
		return `<div class="clip caption" data-start="${c.start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="${60 + (k % 4)}" id="cap-${k}">${esc(c.text)}</div>`
	})
	.join('\n')

// --- Timeline JS -------------------------------------------------------------

const timelineJs = []

for (const { slide, start, duration, i } of timed) {
	const fadeIn = 0.4
	const fadeOut = 0.4
	if (i === 0) {
		// First frame should show the full title card immediately.
		timelineJs.push(`tl.set("#slide-${i}", { opacity: 1 }, ${start});`)
	} else {
		timelineJs.push(
			`tl.fromTo("#slide-${i}", { opacity: 0 }, { opacity: 1, duration: ${fadeIn}, ease: "power2.out" }, ${start});`
		)
	}
	timelineJs.push(
		`tl.to("#slide-${i}", { opacity: 0, duration: ${fadeOut}, ease: "power2.in" }, ${start + duration - fadeOut});`
	)
	timelineJs.push(`tl.set("#slide-${i}", { opacity: 0 }, ${start + duration});`)

	if ((slide.type === 'code' || slide.type === 'diff') && slide.focus && slide.focus.length) {
		const lineHeight = 36
		const focus = slide.focus
		const targets = focus.map((f) => ({
			t: start + (f.at || 0) * duration,
			y: -Math.max(0, f.line - 4) * lineHeight,
		}))
		timelineJs.push(`tl.set("#code-scroll-${i}", { y: ${targets[0].y} }, ${start});`)
		for (let k = 1; k < targets.length; k++) {
			const prev = targets[k - 1]
			const cur = targets[k]
			const dur = Math.max(0.5, cur.t - prev.t)
			timelineJs.push(
				`tl.to("#code-scroll-${i}", { y: ${cur.y}, duration: ${dur}, ease: "power1.inOut" }, ${prev.t});`
			)
		}
	}
}

// --- Final HTML --------------------------------------------------------------

const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=1920, height=1080" />
		<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
		<style>
			/* tldraw.dev light palette (matches docs site).
			   Code blocks: GitHub Light syntax theme. */
			* { margin: 0; padding: 0; box-sizing: border-box; }
			html, body {
				width: 1920px; height: 1080px; overflow: hidden;
				background: #ffffff;
				font-family: "Geist", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
				font-feature-settings: "ss01", "ss02";
				color: #18181b;
				-webkit-font-smoothing: antialiased;
			}

			.slide { position: absolute; inset: 0; opacity: 0; }
			.slide-bg { position: absolute; inset: 0; background: #ffffff; }
			.slide-stage { position: absolute; inset: 0; }

			/* Hero / intro / text */
			.stage--intro {
				display: flex; flex-direction: column;
				justify-content: center; padding: 0 160px;
			}
			.eyebrow {
				display: inline-flex; align-items: center; gap: 16px;
				font-size: 22px; font-weight: 500;
				color: #71717a; margin-bottom: 40px;
			}
			.eyebrow .pill {
				background: rgba(59, 130, 246, 0.10);
				border: 1px solid rgba(59, 130, 246, 0.35);
				padding: 6px 14px; border-radius: 6px;
				color: #1d4ed8; letter-spacing: 0.04em;
				font-weight: 600; font-size: 18px;
			}
			.title-xl {
				font-size: 132px; font-weight: 700; line-height: 1.02;
				letter-spacing: -0.035em; max-width: 1600px;
				color: #09090b;
			}
			.special {
				background: rgba(255, 200, 0, 0.28);
				padding: 0 0.08em;
				border-radius: 6px;
				box-decoration-break: clone;
				-webkit-box-decoration-break: clone;
			}
			.subtitle-lg {
				margin-top: 48px; font-size: 34px; font-weight: 400;
				color: #52525b; max-width: 1500px; line-height: 1.4;
				letter-spacing: -0.005em;
			}
			.meta-row {
				margin-top: 72px; display: flex; align-items: center; gap: 28px;
				font-size: 22px; color: #71717a;
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
				letter-spacing: 0.02em;
			}
			.meta-row .dot { width: 4px; height: 4px; background: #d4d4d8; border-radius: 50%; }

			/* Segment slide */
			.stage--segment {
				display: flex; flex-direction: column;
				justify-content: center; align-items: center;
				padding: 0 160px; gap: 56px;
			}
			.seg-rule {
				width: 96px; height: 2px;
				background: #3b82f6;
				border-radius: 1px;
			}
			.title-segment {
				font-size: 88px; font-weight: 600; letter-spacing: -0.03em;
				text-align: center; max-width: 1600px; line-height: 1.08;
				color: #09090b;
			}

			/* Code / diff slide */
			.stage--code {
				display: flex; flex-direction: column;
				padding: 72px 96px 120px;
			}
			.file-bar {
				display: flex; align-items: center; gap: 20px;
				font-size: 22px; color: #71717a; margin-bottom: 28px;
				padding-bottom: 24px;
				border-bottom: 1px solid #e4e4e7;
			}
			.lang-badge {
				background: #f4f4f5;
				border: 1px solid #e4e4e7;
				color: #52525b; font-weight: 600;
				padding: 5px 10px; border-radius: 4px;
				font-size: 14px; text-transform: uppercase; letter-spacing: 0.10em;
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
			}
			.file-name {
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
				color: #18181b; font-size: 22px; font-weight: 500;
			}
			.slide-title {
				margin-left: auto; color: #71717a;
				font-size: 22px; font-weight: 500;
				letter-spacing: -0.005em;
			}
			.code-viewport {
				position: relative; flex: 1;
				overflow: hidden;
				border-radius: 12px;
				background: #f6f8fa;
				border: 1px solid #d0d7de;
			}
			.code-scroller {
				will-change: transform;
				padding: 28px 0;
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
				font-size: 22px; line-height: 36px;
				color: #24292f; font-weight: 500;
			}
			.code-fade { position: absolute; left: 0; right: 0; height: 64px; pointer-events: none; }
			.code-fade--top    { top: 0;    background: linear-gradient(180deg, #f6f8fa 0%, rgba(246,248,250,0) 100%); }
			.code-fade--bottom { bottom: 0; background: linear-gradient(0deg,   #f6f8fa 0%, rgba(246,248,250,0) 100%); }

			.cl { display: flex; padding: 0 32px; white-space: pre; }
			.cl .ln { color: #afb8c1; width: 56px; flex-shrink: 0; text-align: right; padding-right: 24px; user-select: none; }
			.cl .lc { flex: 1; }

			.dl { display: flex; padding: 0 32px; white-space: pre; }
			.dl .dm { width: 28px; flex-shrink: 0; color: #afb8c1; text-align: center; user-select: none; font-weight: 700; }
			.dl .dc { flex: 1; }
			.dl-add  { background: #dafbe1; }
			.dl-add  .dm { color: #1a7f37; }
			.dl-add  .dc { color: #1f2328; }
			.dl-del  { background: #ffebe9; }
			.dl-del  .dm { color: #cf222e; }
			.dl-del  .dc { color: #1f2328; }
			.dl-hunk { color: #57606a; background: #ddf4ff; }
			.dl-meta { color: #6e7781; opacity: 0.7; }

			/* GitHub Light syntax tokens */
			.t-c { color: #6e7781; font-style: italic; }
			.t-s { color: #0a3069; }
			.t-n { color: #0550ae; }
			.t-k { color: #cf222e; }
			.t-t { color: #1f883d; }
			.t-d { color: #8250df; }

			/* List slide */
			.stage--list {
				display: flex; flex-direction: column;
				justify-content: center; align-items: center;
				padding: 0 160px; gap: 64px;
			}
			.title-list {
				font-size: 72px; font-weight: 600; letter-spacing: -0.025em;
				color: #09090b;
			}
			.list-items {
				list-style: none; display: flex; flex-direction: column;
				gap: 28px; font-size: 44px; color: #18181b;
			}
			.list-item { display: flex; gap: 24px; align-items: baseline; }
			.list-num { color: #3b82f6; font-weight: 700; min-width: 64px; text-align: right; }

			/* Image slide */
			.stage--image {
				display: flex; align-items: center; justify-content: center;
				padding: 64px 96px;
			}
			.image-fill {
				width: 100%; height: 100%;
				object-fit: contain;
			}

			/* Outro */
			.stage--outro {
				display: flex; flex-direction: column;
				justify-content: center; align-items: center; gap: 56px;
			}
			.brand-big { display: flex; align-items: center; justify-content: center; color: #09090b; }
			.brand-big .wordmark { width: 720px; height: auto; }
			.outro-meta {
				font-size: 18px; color: #71717a;
				letter-spacing: 0.16em; text-transform: uppercase;
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
			}

			/* Footer */
			.footer-bar {
				position: absolute; bottom: 32px; left: 96px; right: 96px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-size: 14px; color: #a1a1aa;
				letter-spacing: 0.10em; text-transform: uppercase;
				font-family: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
				z-index: 10;
			}
			.brand {
				display: flex; align-items: center; gap: 12px;
				color: #09090b; font-weight: 600;
				font-family: "Geist", sans-serif;
				letter-spacing: -0.01em; text-transform: none;
				font-size: 18px;
			}
			.brand .mark { width: 24px; height: 24px; color: #09090b; }
			.footer-meta { color: #a1a1aa; }

			/* Captions — yellow on black, anchored to bottom edge */
			.caption-stage {
				position: absolute;
				bottom: 32px;
				left: 50%;
				transform: translateX(-50%);
				width: 100%;
				max-width: 1700px;
				z-index: 9;
				text-align: center;
				pointer-events: none;
			}
			.caption {
				position: absolute;
				bottom: 0;
				left: 50%;
				transform: translateX(-50%);
				width: max-content;
				max-width: 1700px;
				background: #09090b;
				color: #ffd800;
				padding: 14px 24px;
				border-radius: 10px;
				font-family: "Geist", sans-serif;
				font-size: 44px;
				font-weight: 700;
				letter-spacing: -0.02em;
				text-transform: none;
				text-align: center;
				line-height: 1.15;
				white-space: normal;
				text-wrap: balance;
				-webkit-text-wrap: balance;
			}

			/* Pie progress indicator */
			.progress-pie {
				position: absolute;
				top: 40px; right: 96px;
				width: 22px; height: 22px;
				z-index: 11;
				opacity: 0.85;
			}
			.progress-pie svg { width: 100%; height: 100%; display: block; }
		</style>
	</head>
	<body>
		<div id="root"
			data-composition-id="main"
			data-start="0"
			data-duration="${totalDuration}"
			data-width="1920"
			data-height="1080">

${slidesHtml}

			<div class="caption-stage clip" data-start="0" data-duration="${totalDuration}" data-track-index="49" id="caption-stage">
${captionsHtml}
			</div>

			<div class="footer-bar clip" data-start="0" data-duration="${totalDuration}" data-track-index="50" id="footer">
				<div class="brand">${TLDRAW_MARK}<span>tldraw</span></div>
				<div class="footer-meta">PR #${manifest.pr}</div>
			</div>

			<div class="progress-pie clip" data-start="0" data-duration="${totalDuration}" data-track-index="51" id="pie">
				<svg viewBox="0 0 64 64">
					<circle cx="32" cy="32" r="24" fill="none" stroke="#e4e4e7" stroke-width="8"/>
					<circle id="pie-fill" cx="32" cy="32" r="24" fill="none" stroke="#3b82f6" stroke-width="8"
						stroke-dasharray="150.796" stroke-dashoffset="150.796" stroke-linecap="butt"
						transform="rotate(-90 32 32)"/>
				</svg>
			</div>

${audioHtml}

		</div>

		<script>
			window.__timelines = window.__timelines || {};
			const tl = gsap.timeline({ paused: true });

${timelineJs.map((s) => '\t\t\t' + s).join('\n')}

			// Pie indicator — circumference 150.796 (2π·24); fills clockwise.
			tl.fromTo("#pie-fill",
				{ attr: { "stroke-dashoffset": 150.796 } },
				{ attr: { "stroke-dashoffset": 0 }, duration: ${totalDuration}, ease: "none" },
				0);

			tl.set("#footer", { opacity: 1 }, 0);
			tl.to("#footer", { opacity: 0, duration: 0.6 }, ${totalDuration - 0.6});

			window.__timelines["main"] = tl;
		</script>
	</body>
</html>
`

fs.writeFileSync(path.join(__dirname, 'index.html'), html)

console.log(`Wrote ${path.relative(process.cwd(), path.join(__dirname, 'index.html'))}`)
console.log(`  ${timed.length} slides, ${totalDuration.toFixed(2)}s total`)
console.log(
	`  ${timed.filter((t) => t.slide.audio).length} audio tracks, ${allCaptions.length} captions`
)
