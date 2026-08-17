import { join } from 'path'
import { REPO_ROOT, readJsonIfExists } from './lib/file'
import { PRODUCT_CONFIG_KEY, ProductConfig } from './lib/types'
import { getAllWorkspacePackages } from './lib/workspace'

interface ManifestComponent extends ProductConfig {
	packages: { name: string; description?: string }[]
	features: ManifestComponent[]
}

/**
 * Prints the product manifest: the commercial components customers license, as a tree. Top-level
 * entries are order form line items; their `features` are the parts that can be licensed
 * individually, listed indented beneath them on the order form.
 *
 * This is the aggregate view of the `tldraw_product` fields in each package's package.json — those
 * fields are the source of truth, and are validated by `yarn check-packages`. See
 * internal/docs/product-stable-ids.md.
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

		// packages sharing a stable id are required to have identical product metadata; this is
		// enforced by `yarn check-packages`, so taking the first package's config here is safe
		const component = componentsById.get(product.stableId) ?? {
			...product,
			packages: [],
			features: [],
		}
		component.packages.push({
			name: packageJson.name,
			description: packageJson.description,
		})
		componentsById.set(product.stableId, component)
	}

	const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
	const all = [...componentsById.values()].sort(byName)
	for (const component of all) {
		component.packages.sort(byName)
	}

	// nest features under the component they belong to. `check-packages` guarantees every parent
	// resolves, so nothing can be silently dropped here.
	for (const component of all) {
		if (component.parent) {
			componentsById.get(component.parent)!.features.push(component)
		}
	}
	// the standard offering leads, then the premium modules, matching the order form's layout
	const products = all
		.filter((component) => !component.parent)
		.sort((a, b) => Number(a.premium) - Number(b.premium) || byName(a, b))

	// eslint-disable-next-line no-console
	console.log(JSON.stringify({ version: lernaJson.version, products }, null, '\t'))
}

main()
