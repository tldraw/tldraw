#!/usr/bin/env node
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_FONT_FILE = path.resolve(__dirname, '..', 'assets', 'Geist.ttf')

const configPath = process.argv[2]

if (!configPath) {
	console.error('Usage: node scripts/compose-before-after.mjs <config.json>')
	process.exit(1)
}

const configFile = path.resolve(configPath)
const configDir = path.dirname(configFile)
const config = JSON.parse(await fs.readFile(configFile, 'utf8'))

const width = config.width ?? 1280
const height = config.height ?? 720
const fps = config.fps ?? 30
const output = resolveFromConfig(config.output ?? 'out/before-after.mp4')
const tempDir = path.resolve(resolveFromConfig(config.tempDir ?? path.join(os.tmpdir(), 'before-after-video')))
const crf = String(config.crf ?? 22)

if (!Array.isArray(config.sections) || config.sections.length !== 2) {
	throw new Error('Config must include exactly two sections.')
}

await fs.mkdir(path.dirname(output), { recursive: true })
await fs.rm(tempDir, { recursive: true, force: true })
await fs.mkdir(tempDir, { recursive: true })

const framedVideos = []

for (let i = 0; i < config.sections.length; i++) {
	const section = config.sections[i]
	if (!section.video) throw new Error(`Section ${i} is missing "video".`)
	const framed = path.join(tempDir, `${String(i).padStart(2, '0')}-${section.type ?? i}.mp4`)
	await renderSection(section, framed, i)
	framedVideos.push(framed)
}

await concatSections(framedVideos)
console.log(output)

function resolveFromConfig(filePath) {
	if (!filePath) return filePath
	return path.isAbsolute(filePath) ? filePath : path.resolve(configDir, filePath)
}

function toFfmpegColor(color) {
	if (!color) return color
	if (color.startsWith('#')) return `0x${color.slice(1)}`
	return color
}

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (chunk) => {
			stdout += chunk
		})
		child.stderr.on('data', (chunk) => {
			stderr += chunk
		})
		child.on('error', reject)
		child.on('close', (code) => {
			if (code === 0) resolve({ stdout, stderr })
			else reject(new Error(`${command} exited with ${code}\n${stderr || stdout}`))
		})
	})
}

async function probeDuration(filePath) {
	const { stdout } = await run('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'csv=p=0',
		filePath,
	])
	const duration = Number.parseFloat(stdout.trim())
	if (!Number.isFinite(duration)) throw new Error(`Could not read duration for ${filePath}`)
	return duration
}

async function writeTextFile(name, text) {
	const filePath = path.join(tempDir, `${name}.txt`)
	await fs.writeFile(filePath, text ?? '', 'utf8')
	return filePath
}

function escapeFontFile(p) {
	return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function drawText({ textFile, x, y, size = 22, color = '#171717', enable, fontFile }) {
	const parts = [
		`textfile=${textFile}`,
		`x=${x}`,
		`y=${y}`,
		`fontsize=${size}`,
		`fontcolor=${toFfmpegColor(color)}`,
	]
	if (fontFile) parts.push(`fontfile=${escapeFontFile(fontFile)}`)
	if (enable) parts.push(`enable='${enable}'`)
	return `drawtext=${parts.join(':')}`
}

async function renderSection(section, outFile, index) {
	const input = resolveFromConfig(section.video)
	const duration = await probeDuration(input)
	const status = section.status ?? (section.type === 'after' || index === 1 ? 'After' : 'Before')
	const markerColor = section.markerColor ?? (status.toLowerCase() === 'after' ? '#5dbb63' : '#df4038')
	const footerText = section.footerText ?? ''
	const labels = Array.isArray(section.labels) ? section.labels : []

	const statusFile = await writeTextFile(`${index}-status`, status)
	const footerFile = await writeTextFile(`${index}-footer`, footerText)
	const labelFiles = []
	for (let i = 0; i < labels.length; i++) {
		labelFiles.push(await writeTextFile(`${index}-label-${i}`, labels[i].text ?? ''))
	}

	const footerH = config.footerH ?? 56
	const footerColor = toFfmpegColor(config.footer ?? '#0f1115')
	const footerTextColor = toFfmpegColor(config.footerTextColor ?? '#ffffff')
	const fontFile = resolveFromConfig(config.fontFile ?? DEFAULT_FONT_FILE)
	const mediaW = width
	const mediaH = height - footerH
	const cropAnchor = section.cropAnchor ?? config.cropAnchor ?? 'center'
	const cropY =
		cropAnchor === 'top' ? '0' : cropAnchor === 'bottom' ? '(in_h-out_h)' : '(in_h-out_h)/2'

	const dotSize = config.dotSize ?? 12
	const textSize = config.textSize ?? 19
	const dotX = 40
	const dotY = mediaH + Math.round((footerH - dotSize) / 2)
	const statusX = dotX + dotSize + 14
	const labelX = statusX + 92
	const textY = mediaH + Math.round((footerH - textSize) / 2) - 2

	const filters = [
		`[0:v]scale=${mediaW}:${mediaH}:force_original_aspect_ratio=increase,crop=${mediaW}:${mediaH}:0:${cropY},fps=${fps},setsar=1[vid]`,
		`color=c=${footerColor}:s=${width}x${footerH}:r=${fps}:d=${duration}[footerBg]`,
		`color=c=${markerColor}:s=${dotSize}x${dotSize}:d=${duration},format=rgba,geq=r='r(X\\,Y)':g='g(X\\,Y)':b='b(X\\,Y)':a='255*min(1\\,max(0\\,(W/2-0.5)-hypot(X-(W-1)/2\\,Y-(H-1)/2)))'[dot]`,
		`[vid][footerBg]vstack=inputs=2[stack]`,
		`[stack][dot]overlay=${dotX}:${dotY}[withDot]`,
		`[withDot]${drawText({ textFile: statusFile, x: statusX, y: textY, size: textSize, color: footerTextColor, fontFile })}`,
	]

	const last = filters.length - 1
	if (labels.length > 0) {
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i]
			const from = Number(label.from ?? 0)
			const to = Number(label.to ?? duration)
			filters[last] += `,${drawText({
				textFile: labelFiles[i],
				x: labelX,
				y: textY,
				size: textSize,
				color: footerTextColor,
				fontFile,
				enable: `between(t,${from},${to})`,
			})}`
		}
	} else if (footerText) {
		filters[last] += `,${drawText({
			textFile: footerFile,
			x: labelX,
			y: textY,
			size: textSize,
			color: footerTextColor,
			fontFile,
		})}`
	}

	filters[last] += '[out]'

	await run('ffmpeg', [
		'-loglevel',
		'error',
		'-y',
		'-i',
		input,
		'-filter_complex',
		filters.join(';'),
		'-map',
		'[out]',
		'-an',
		'-c:v',
		'libx264',
		'-preset',
		'slow',
		'-crf',
		crf,
		'-r',
		String(fps),
		'-pix_fmt',
		'yuv420p',
		outFile,
	])
}

async function concatSections(sectionFiles) {
	const args = ['-loglevel', 'error', '-y']
	for (const filePath of sectionFiles) {
		args.push('-i', filePath)
	}

	const audio = config.audio ? resolveFromConfig(config.audio) : null
	if (audio) args.push('-i', audio)

	if (audio) {
		const audioIndex = sectionFiles.length
		const tempo = config.audioTempo ?? 1
		const audioFilter = tempo === 1 ? `[${audioIndex}:a]apad[a]` : `[${audioIndex}:a]atempo=${tempo},apad[a]`
		args.push(
			'-filter_complex',
			`[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p,fps=${fps}[v];${audioFilter}`,
			'-map',
			'[v]',
			'-map',
			'[a]',
			'-shortest',
			'-c:v',
			'libx264',
			'-preset',
			'slow',
			'-crf',
			crf,
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-b:a',
			'96k',
			'-ar',
			'48000'
		)
	} else {
		args.push(
			'-filter_complex',
			`[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p,fps=${fps}[v]`,
			'-map',
			'[v]',
			'-an',
			'-c:v',
			'libx264',
			'-preset',
			'slow',
			'-crf',
			crf,
			'-pix_fmt',
			'yuv420p'
		)
	}

	args.push('-movflags', '+faststart', output)
	await run('ffmpeg', args)
}
