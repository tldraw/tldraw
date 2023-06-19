/** @internal */
import '@tldraw/polyfills'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/primitives'
export { defineMigrations } from '@tldraw/store'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/ui'
export { Tldraw } from './lib/Tldraw'
