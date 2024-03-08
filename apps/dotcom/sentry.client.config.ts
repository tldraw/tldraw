// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { ExtraErrorData } from '@sentry/integrations'
import * as Sentry from '@sentry/react'
import { Editor, getErrorAnnotations } from 'tldraw'
import { sentryReleaseName } from './sentry-release-name'
import { env } from './src/utils/env'
import { setGlobalErrorReporter } from './src/utils/errorReporting'

function requireSentryDsn() {
	if (!process.env.SENTRY_DSN) {
		throw new Error('SENTRY_DSN is required')
	}
	return process.env.SENTRY_DSN as string
}

Sentry.init({
	dsn: env === 'development' ? undefined : requireSentryDsn(),
	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 1.0,
	release: sentryReleaseName,
	environment: env,
	integrations: [new ExtraErrorData({ depth: 10 }) as any],
	// ...
	// Note: if you want to override the automatic release value, do not set a
	// `release` value here - use the environment variable `SENTRY_RELEASE`, so
	// that it will also get attached to your source maps

	beforeSend: (event, hint) => {
		if (env === 'development') {
			console.error('[SentryDev]', hint.originalException ?? hint.syntheticException)
			return null
		}
		// todo: re-evaulate use of window here?
		const editor: Editor | undefined = (window as any).editor
		const appErrorAnnotations = editor?.createErrorAnnotations('unknown', 'unknown')
		const errorAnnotations = getErrorAnnotations(hint.originalException as any)

		event.tags = {
			...appErrorAnnotations?.tags,
			...errorAnnotations.tags,
			...event.tags,
		}

		event.extra = {
			...appErrorAnnotations?.extras,
			...errorAnnotations.extras,
			...event.extra,
		}

		return event
	},
})

setGlobalErrorReporter((error) => Sentry.captureException(error))
