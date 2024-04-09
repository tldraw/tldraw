// This sets up some mutually exclusive environment flags

const TLDRAW_ENV = process.env.TLDRAW_ENV
if (!TLDRAW_ENV) {
	throw new Error('TLDRAW_ENV must be set')
}

/**
 * True if the app is running at staging.tldraw.com only.
 */
export const isStagingEnv = TLDRAW_ENV === 'staging'
/**
 * True if the app is running in a preview environment that is not staging.tldraw.com, e.g. a PR deploy.
 */
export const isPreviewEnv = TLDRAW_ENV === 'preview'
/**
 * True if the app is running at www.tldraw.com only.
 */
export const isProductionEnv = TLDRAW_ENV === 'production'
/**
 * True if the app is running in a development environment, e.g. localhost.
 */
export const isDevelopmentEnv = TLDRAW_ENV === 'development'

/**
 * The current environment, one of 'staging', 'preview', or 'production'.
 * These are mutually exclusive.
 *
 * - staging: staging.tldraw.com
 * - preview: any PR deploy or other preview deploy from vercel
 * - production: www.tldraw.com
 * - development: localhost
 *
 */
export const env = TLDRAW_ENV as 'staging' | 'preview' | 'production' | 'development'
