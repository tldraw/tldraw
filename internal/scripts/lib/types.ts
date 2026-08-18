import { T } from '@tldraw/validate'

export const EXPORT_CONFIG_KEY = 'tldraw_template' as const

export const TemplateDeployConfig = T.object({
	// Where the live demo is hosted. The vercel-hosted demos deploy through vercel's own git
	// integration, so only cloudflare templates carry a `deploy` config.
	target: T.literalEnum('cloudflare'),
	// The hostname the demo is served from. Must match the custom domain route in wrangler.toml.
	host: T.string,
})
export type TemplateDeployConfig = T.TypeOf<typeof TemplateDeployConfig>

export const TemplateConfig = T.object({
	repo: T.string,
	cli: T.object({
		name: T.string,
		description: T.string,
		shortDescription: T.string.optional(),
		order: T.number.optional(),
	}).optional(),
	deploy: TemplateDeployConfig.optional(),
	scripts: T.dict(T.string, T.nullable(T.string)).optional(),
})
export type TemplateConfig = T.TypeOf<typeof TemplateConfig>

export const PRODUCT_CONFIG_KEY = 'tldraw_product' as const

/**
 * Commercial product metadata for a published package. The `stableId` identifies the commercial
 * component a package belongs to; it is referenced by legal in order forms and must never change,
 * even if the package is renamed or moved. Several packages can share one stable id. See
 * `internal/docs/product-stable-ids.md` for the full convention.
 */
export const ProductConfig = T.object({
	// Immutable commercial identifier, e.g. `tldraw:sdk-core`. Never changes on rename/refactor.
	stableId: T.string,
	// Customer-facing label, matching the wording used on the order form, e.g. 'Collaboration
	// module'. Unlike stableId this may be reworded; the id is what contracts reference.
	name: T.string,
	// `product` is a top-level order form line item; `feature` is an optional part of its parent
	// that can be licensed on its own, listed indented beneath it on the order form.
	type: T.literalEnum('product', 'feature'),
	// The component this one belongs to, e.g. commenting's parent is the collaboration module.
	// Components without a parent are top-level order form line items.
	parent: T.string.optional(),
	// Whether this component is separately licensed rather than part of the standard SDK offering.
	premium: T.boolean,
	// For premium components: the license key FLAGS bit (in packages/editor's LicenseManager) that
	// entitles a customer to this component.
	licenseFlag: T.string.optional(),
})
export type ProductConfig = T.TypeOf<typeof ProductConfig>

export const PackageJson = T.object({
	name: T.string,
	private: T.boolean.optional(),
	workspaces: T.arrayOf(T.string).optional(),
	[EXPORT_CONFIG_KEY]: TemplateConfig.optional(),
	[PRODUCT_CONFIG_KEY]: ProductConfig.optional(),
	license: T.string.optional(),
	description: T.string.optional(),
	scripts: T.dict(T.string, T.nullable(T.string)).optional(),
	dependencies: T.dict(T.string, T.string).optional(),
	devDependencies: T.dict(T.string, T.string).optional(),
	peerDependencies: T.dict(T.string, T.string).optional(),
}).allowUnknownProperties()
export type PackageJson = T.TypeOf<typeof PackageJson>

export const TsConfigJson = T.object({
	references: T.arrayOf(
		T.object({
			path: T.string,
		})
	).optional(),
}).allowUnknownProperties()
export type TsConfigJson = T.TypeOf<typeof TsConfigJson>
