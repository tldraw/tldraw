// @ts-check
/* eslint-disable */

const kleur = require('kleur')
const fs = require('fs')
const path = require('path')

const typeName = process.argv[2]
const lowerAssetName = typeName[2].toLowerCase() + typeName.slice(3)

if (!typeName.match(/^TL[A-Z][a-z]+[a-zA-Z0-9]+Asset$/)) {
	console.error(
		kleur.red('ERROR: Type name must start with'),
		`'${kleur.bold('TL')}'`,
		kleur.red('and be in'),
		kleur.bold('PascalCase'),
		kleur.red('and end in'),
		kleur.bold('Asset')
	)
	process.exit(1)
}

const recordsDir = path.join(__dirname, '..', 'src', 'assets')
if (!fs.existsSync(recordsDir)) {
	console.error(kleur.red("ERROR: Can't find assets directory at path"), recordsDir)
	process.exit(1)
}

const filePath = path.join(recordsDir, `${typeName}.ts`)

if (fs.existsSync(filePath)) {
	console.error(kleur.red('ERROR: File already exists at path'), filePath)
	process.exit(1)
}

const snakeCaseName =
	typeName[2].toLowerCase() +
	typeName
		.slice(3, -5)
		.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
		.trimStart()

fs.writeFileSync(
	filePath,
	`import { defineMigrations } from '@tldraw/tlstore'
import { TLAsset } from '../records/TLAsset'

declare module '../records/TLAsset' {
	interface GlobalAssetPropsMap {
		${snakeCaseName}: ${typeName}Props
	}
}

// IMPORTANT: If you update this interface, you must also bump the version number and add a migration
export type ${typeName}Props = {}

export type ${typeName} = Extract<TLAsset, { type: '${snakeCaseName}' }>

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

export const ${lowerAssetName}Migrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
	  // STEP 3: Add an up+down migration for the new version here
  },
})

`
)

console.log(kleur.green('Created new record type at path'), filePath)
