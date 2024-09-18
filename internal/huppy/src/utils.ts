import * as fs from 'fs/promises'
import json5 from 'json5'
import { NextApiRequest } from 'next'

export function header(req: NextApiRequest, name: keyof NextApiRequest['headers']): string {
	const value = req.headers[name]
	if (!value) {
		throw new Error(`Missing header: ${name}`)
	}
	if (Array.isArray(value)) {
		throw new Error(`Header ${name} has multiple values`)
	}
	return value
}

export function firstLine(str: string) {
	return str.split('\n')[0]
}

export function sleepMs(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function camelCase(name: string) {
	return name.replace(/[_-]([a-z0-9])/gi, (g) => g[1].toUpperCase())
}

export function capitalize(name: string) {
	return name[0].toUpperCase() + name.slice(1)
}

export function elapsed(start: number) {
	return `${((Date.now() - start) / 1000).toFixed(2)}s`
}

export async function readFileIfExists(file: string) {
	try {
		return await fs.readFile(file, 'utf8')
	} catch {
		return null
	}
}

export async function readJsonIfExists(file: string) {
	const fileContents = await readFileIfExists(file)
	if (fileContents === null) {
		return null
	}
	return json5.parse(fileContents)
}
