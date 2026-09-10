import { readdir } from 'fs/promises'
import { join } from 'path'
import { exec } from './lib/exec'
import { readJsonIfExists, REPO_ROOT } from './lib/file'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { EXPORT_CONFIG_KEY, PackageJson } from './lib/types'

const TEMPLATE_DIR = join(REPO_ROOT, 'templates')

/**
 * Like `makeEnv`, but also rejects empty values. Github expands an unconfigured secret or variable
 * to the empty string rather than leaving it unset, so `makeEnv` alone would let a missing license
 * key through and we'd deploy unlicensed demos on a green CI run — the exact thing this script
 * exists to prevent.
 */
function requireEnv<const Keys extends readonly string[]>(keys: Keys) {
	const env = makeEnv(keys)
	const emptyVars = keys.filter((key) => env[key as keyof typeof env] === '')
	if (emptyVars.length > 0) {
		throw new Error(`Empty environment variables: ${emptyVars.join(', ')}`)
	}
	return env
}

// The license key for the demos deployed from here. Don't set one in the cloudflare dashboard as
// well: a key configured there is invisible to this repo, so nothing catches it silently expiring.
//
// The templates themselves never reference it. tldraw's LicenseProvider picks it up from the build
// environment (see getLicenseKeyFromEnv in packages/editor/src/lib/license/LicenseProvider.tsx), so
// the exported public templates stay free of our key.
const env = requireEnv(['TEMPLATES_TLDRAW_LICENSE_KEY'])

// every template deployed from here builds with vite. A next.js template would need
// NEXT_PUBLIC_TLDRAW_LICENSE_KEY instead.
const licenseEnv = { VITE_TLDRAW_LICENSE_KEY: env.TEMPLATES_TLDRAW_LICENSE_KEY }

async function main() {
	const templateName = process.argv[2]
	if (!templateName) {
		nicelog('Usage: tsx deploy-template.ts <template-name>')
		process.exit(1)
	}

	const possibleTemplates = (await readdir(TEMPLATE_DIR, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name)

	if (!possibleTemplates.includes(templateName)) {
		nicelog(`Template "${templateName}" not found.`)
		nicelog(`Possible templates: ${possibleTemplates.join(', ')}`)
		process.exit(1)
	}

	const templateDir = join(TEMPLATE_DIR, templateName)
	const packageJsonRaw = await readJsonIfExists(join(templateDir, 'package.json'))
	if (!packageJsonRaw) {
		nicelog('No package.json found')
		process.exit(1)
	}

	const packageJson = PackageJson.validate(packageJsonRaw)
	const deployConfig = packageJson[EXPORT_CONFIG_KEY]?.deploy
	if (!deployConfig) {
		nicelog(`Template "${templateName}" has no deploy config. Skipping.`)
		process.exit(0)
	}

	await deployToCloudflare(templateName, templateDir)

	nicelog(`Deployed ${templateName} to https://${deployConfig.host}`)
}

async function deployToCloudflare(templateName: string, templateDir: string) {
	const cloudflareEnv = requireEnv(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])

	nicelog(`Building ${templateName}...`)
	await exec('yarn', ['run', 'build'], {
		pwd: templateDir,
		env: { ...licenseEnv, NODE_ENV: 'production' },
	})

	// The route (including the custom domain) comes from the template's own wrangler.toml, which
	// ships to users too — so the deploy target is described in one place rather than here.
	nicelog(`Deploying ${templateName} to cloudflare...`)
	await exec('yarn', ['wrangler', 'deploy'], {
		pwd: templateDir,
		env: {
			...cloudflareEnv,
			NODE_ENV: 'production',
			// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
			CI: '1',
		},
	})
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
