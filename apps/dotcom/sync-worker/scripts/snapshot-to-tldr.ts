#!/usr/bin/env tsx
/**
 * Convert a `RoomSnapshot` JSON blob (as stored in the `rooms-history-ephemeral`
 * R2 bucket) into a `.tldr` file that can be opened in the tldraw editor.
 *
 * Usage:
 *   tsx scripts/snapshot-to-tldr.ts [--in <path>] [--out <path>]
 *
 * Reads from stdin by default, writes to stdout by default.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { RoomSnapshot } from '@tldraw/sync-core'
// Import directly from the source file so we don't load the full `tldraw`
// package (React, editor, etc.) just for a pure data transform.
import { roomSnapshotToTldrawFile } from '../../../../packages/tldraw/src/lib/utils/tldr/roomSnapshotToTldrawFile'

interface CliArgs {
	in?: string
	out?: string
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '--in') {
			args.in = argv[++i]
		} else if (arg === '--out') {
			args.out = argv[++i]
		} else if (arg === '-h' || arg === '--help') {
			process.stdout.write('Usage: tsx scripts/snapshot-to-tldr.ts [--in <path>] [--out <path>]\n')
			process.exit(0)
		} else {
			process.stderr.write(`Unknown argument: ${arg}\n`)
			process.exit(1)
		}
	}
	return args
}

function readInput(path: string | undefined): string {
	if (path) return readFileSync(path, 'utf-8')
	return readFileSync(0, 'utf-8')
}

function main() {
	const args = parseArgs(process.argv.slice(2))
	const input = readInput(args.in)
	const snapshot = JSON.parse(input) as RoomSnapshot
	const file = roomSnapshotToTldrawFile(snapshot)
	const output = JSON.stringify(file)
	if (args.out) {
		writeFileSync(args.out, output)
	} else {
		process.stdout.write(output)
	}
}

main()
