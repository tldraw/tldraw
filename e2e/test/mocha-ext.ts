const mochaIt = global.it
const describe = global.describe

const DEFAULT_ENV_HANDLER = () => ({
	shouldIgnore: false,
	skipMessage: '',
})

type EnvOpts = {
	device?: 'mobile' | 'desktop'
	skipBrowsers?: ('firefox' | 'safari' | 'edge' | 'samsung' | 'chrome' | 'vscode')[]
	input?: ('mouse' | 'touch')[]
	os?: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'ipados'
	ui?: 'mobile' | 'desktop'
	ignoreWhen?: () => boolean
}

// Gets set by env(...) and read in it(...)
let envMethod = DEFAULT_ENV_HANDLER

/** This is a mocha extension to allow us to run tests only for specific environments */
const env = (opts: EnvOpts, handler: () => void) => {
	envMethod = () => {
		// @ts-ignore
		const { tldrawOptions } = global
		let skipMessage = '(ignored)'
		let shouldIgnore = false

		if (opts.device && tldrawOptions.device !== opts.device) {
			shouldIgnore = true
			skipMessage = `(ignored only: ${opts.device})`
		}
		if (opts.skipBrowsers && opts.skipBrowsers.includes(tldrawOptions.browser)) {
			shouldIgnore = true
			skipMessage = `(ignored browser)`
		}
		if (opts.input && !tldrawOptions.input?.find((item) => opts.input.includes(item))) {
			shouldIgnore = true
			skipMessage = `(ignored only: ${opts.input.join(', ')})`
		}
		if (opts.ui && tldrawOptions.ui !== opts.ui) {
			shouldIgnore = true
			skipMessage = `(ignored only: ${opts.ui})`
		}
		if (opts.os && tldrawOptions.os !== opts.os) {
			shouldIgnore = true
			skipMessage = `(ignored only: ${opts.os})`
		}
		if (opts.ignoreWhen && opts.ignoreWhen()) {
			shouldIgnore = true
		}

		return { skipMessage, shouldIgnore }
	}

	handler()
	envMethod = DEFAULT_ENV_HANDLER
}

/** Same usage as the mocha it(...) method */
const it = (msg: string, handler: () => void) => {
	const { shouldIgnore, skipMessage } = envMethod()
	if (shouldIgnore) {
		mochaIt(msg + ' ' + skipMessage, () => {})
	} else {
		mochaIt(msg, handler)
	}
}

/** Same usage as the mocha it.only(...) method */
// eslint-disable-next-line no-only-tests/no-only-tests
it.only = (msg: string, handler: () => void) => {
	const { shouldIgnore, skipMessage } = envMethod()
	if (shouldIgnore) {
		mochaIt.only(msg + ' ' + skipMessage, () => {})
	} else {
		mochaIt.only(msg, handler)
	}
}

/** Same usage as the mocha it.skip(...) method */
it.skip = (msg: string, handler: () => void) => {
	const { shouldIgnore, skipMessage } = envMethod()
	if (shouldIgnore) {
		mochaIt.skip(msg + ' ' + skipMessage, () => {})
	} else {
		mochaIt.skip(msg, handler)
	}
}

/** Same usage as the mocha it.skip(...) method */
it.todo = (msg: string, _handler?: () => void) => {
	mochaIt.skip('[TODO] ' + msg, () => {})
}

it.ok = it

it.fails = (msg: string, handler: () => void | Promise<void>) => {
	const { shouldIgnore, skipMessage } = envMethod()
	if (shouldIgnore) {
		mochaIt('[FAILS] ' + msg + ' ' + skipMessage, () => {})
	} else {
		mochaIt('[FAILS] ' + msg, async () => {
			let failed = false
			try {
				await handler()
			} catch (err: any) {
				failed = true
			}

			if (!failed) {
				throw new Error('This expected to fail, did you fix it?')
			}
		})
	}
}

export { env, describe, it }
