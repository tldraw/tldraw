import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_WORK_DIR } from './config'
import type { EvalResults, RoomSample } from './types'

export function resolveWorkDir(args: { 'work-dir'?: string }): string {
	const dir = args['work-dir'] ?? DEFAULT_WORK_DIR
	mkdirSync(dir, { recursive: true })
	return dir
}

export function readJsonIfExists<T>(path: string): T | null {
	if (!existsSync(path)) return null
	return JSON.parse(readFileSync(path, 'utf-8')) as T
}

export function writeJson(path: string, value: unknown) {
	writeFileSync(path, JSON.stringify(value, null, 2))
}

export function loadRooms(workDir: string): RoomSample[] {
	const rooms = readJsonIfExists<RoomSample[]>(join(workDir, 'rooms.json'))
	if (!rooms) {
		throw new Error(`No rooms.json in ${workDir} — run the select stage first`)
	}
	return rooms
}

export function historyDir(workDir: string, slug: string): string {
	return join(workDir, 'history', slug)
}

export function repoDir(workDir: string, slug: string, layout: string): string {
	return join(workDir, 'repos', slug, layout)
}

/** Merge a keyed measurement into a JSON array file (upsert by key fields). */
export function upsertMeasurement<T>(path: string, keys: (keyof T)[], value: T) {
	const existing = readJsonIfExists<T[]>(path) ?? []
	const filtered = existing.filter((m) => !keys.every((k) => m[k] === value[k]))
	filtered.push(value)
	writeJson(path, filtered)
}

export function loadResults(workDir: string): EvalResults {
	return {
		rooms: readJsonIfExists(join(workDir, 'rooms.json')) ?? [],
		measurements: readJsonIfExists(join(workDir, 'measurements.json')) ?? [],
		pushes: readJsonIfExists(join(workDir, 'pushes.json')) ?? [],
		incremental: readJsonIfExists(join(workDir, 'incremental.json')) ?? [],
	}
}
