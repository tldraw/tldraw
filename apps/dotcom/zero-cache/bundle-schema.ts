import { readFileSync, writeFileSync } from 'fs'
/* eslint-disable no-console */
import { build, context, type BuildOptions, type Plugin } from 'esbuild'
import { getDotcomDevEnv } from './dev-env'

const env = getDotcomDevEnv()

// nodemon restarts zero-cache whenever .schema.js changes, but esbuild rewrites its outfile on
// every rebuild even when the output is identical. In watch mode the initial build lands right
// after dev.ts has already bundled the schema once and started zero-cache, so that no-op rewrite
// SIGINTed zero-cache mid-boot and could strand nodemon in its crashed state ("app crashed -
// waiting for file changes"), wedging the whole dev stack at "Waiting for Zero...". Writing the
// file only when its content actually changed keeps nodemon restarts tied to real schema changes.
const writeIfChanged: Plugin = {
	name: 'write-if-changed',
	setup(pluginBuild) {
		pluginBuild.onEnd((result) => {
			for (const file of result.outputFiles ?? []) {
				let previous: Buffer | undefined
				try {
					previous = readFileSync(file.path)
				} catch {
					previous = undefined
				}
				if (previous && previous.equals(Buffer.from(file.contents))) continue
				writeFileSync(file.path, file.contents)
			}
		})
	},
}

const options: BuildOptions = {
	entryPoints: [env.schemaSourceFile],
	bundle: true,
	platform: 'node',
	format: 'esm',
	outfile: env.schemaFile,
	write: false,
	plugins: [writeIfChanged],
	logLevel: 'info',
}

if (process.argv.includes('--watch')) {
	const ctx = await context(options)
	await ctx.watch()
} else {
	await build(options)
}
