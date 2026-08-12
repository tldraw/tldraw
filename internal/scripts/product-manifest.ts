import { join } from 'path'
import { REPO_ROOT, readJsonIfExists } from './lib/file'
import { PRODUCT_CONFIG_KEY, ProductConfig } from './lib/types'
import { getAllWorkspacePackages } from './lib/workspace'

interface ManifestComponent extends ProductConfig {
	packages: { name: string; description?: string }[]
}

/**
 * Prints the product manifest: every commercial component (stable id) and the published npm
 * packages that make it up. This is the aggregate view of the `tldraw_product` fields in each
 * package's package.json — those fields are the source of truth, and are validated by
 * `yarn check-packages`. See internal/docs/product-stable-ids.md.
 */
async function main() {
	const lernaJson = (await readJsonIfExists(join(REPO_ROOT, 'lerna.json'))) as {
		version: string
	} | null
	if (!lernaJson) throw new Error('Could not read lerna.json')

	const componentsById = new Map<string, ManifestComponent>()

	for (const { packageJson, relativePath } of await getAllWorkspacePackages()) {
		if (!relativePath.startsWith('packages/') || packageJson.private) continue
		const product = packageJson[PRODUCT_CONFIG_KEY]
		if (!product) continue

		const component = componentsById.get(product.stableId) ?? { ...product, packages: [] }
		component.packages.push({
			name: packageJson.name,
			description: (packageJson as any).description,
		})
		componentsById.set(product.stableId, component)
	}

	const components = [...componentsById.values()].sort((a, b) =>
		a.stableId.localeCompare(b.stableId)
	)
	for (const component of components) {
		component.packages.sort((a, b) => a.name.localeCompare(b.name))
	}

	// eslint-disable-next-line no-console
	console.log(JSON.stringify({ version: lernaJson.version, components }, null, '\t'))
}

main()
