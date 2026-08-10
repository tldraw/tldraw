import { T } from '@tldraw/validate'

export const EXPORT_CONFIG_KEY = 'tldraw_template' as const

export const TemplateDeployConfig = T.object({
	// Where the live demo is hosted. Templates without a `deploy` config aren't deployed at all.
	target: T.literalEnum('cloudflare', 'vercel'),
	// The hostname the demo is served from. For cloudflare templates this must match the custom
	// domain route in wrangler.toml; for vercel templates it's the production alias.
	host: T.string,
	// Vercel only: the name of the CI variable holding this template's vercel project id.
	projectIdVar: T.string.optional(),
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

export const PackageJson = T.object({
	name: T.string,
	private: T.boolean.optional(),
	workspaces: T.arrayOf(T.string).optional(),
	[EXPORT_CONFIG_KEY]: TemplateConfig.optional(),
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
