/**
 * Tiny ANSI color helpers. We honor `NO_COLOR` and `--no-color` as well as
 * non-TTY stdouts, so reports stay clean when piped to a file or consumed by
 * a non-terminal tool.
 */

let enabled = process.stdout.isTTY === true && !process.env.NO_COLOR

export function setColorEnabled(value: boolean): void {
	enabled = value
}

function wrap(open: string, close: string) {
	return (s: string) => (enabled ? `${open}${s}${close}` : s)
}

export const colors = {
	reset: wrap('\x1b[0m', ''),
	bold: wrap('\x1b[1m', '\x1b[22m'),
	dim: wrap('\x1b[2m', '\x1b[22m'),
	red: wrap('\x1b[31m', '\x1b[39m'),
	green: wrap('\x1b[32m', '\x1b[39m'),
	yellow: wrap('\x1b[33m', '\x1b[39m'),
	cyan: wrap('\x1b[36m', '\x1b[39m'),
	gray: wrap('\x1b[90m', '\x1b[39m'),
}
