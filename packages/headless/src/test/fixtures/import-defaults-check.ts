// The whole justification for the tldraw/headless-defaults entry: importing it must pull no
// eager browser-UI module (radix, react-remove-scroll, react-dom/client) whose side effects
// would hold the event loop open or touch missing DOM globals. If one re-enters the graph,
// this either throws or hangs past the spawn timeout.
import 'tldraw/headless-defaults'

if (typeof (globalThis as any).document !== 'undefined') {
	throw new Error('importing headless-defaults leaked a global document')
}
// eslint-disable-next-line no-console
console.log('IMPORT_DEFAULTS_OK')
