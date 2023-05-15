// @ts-check
/* eslint-disable */

const kleur = require('kleur')
const fs = require('fs')
const path = require('path')

const typeName = process.argv[2]

if (!typeName.match(/^TL[A-Z][a-z]+[a-zA-Z0-9]+$/)) {
	console.error(
		kleur.red('ERROR: Type name must start with'),
		`'${kleur.bold('TL')}'`,
		kleur.red('and be in'),
		kleur.bold('PascalCase')
	)
	process.exit(1)
}

const lowerCaseName = typeName[2].toLowerCase() + typeName.slice(3)

const recordsDir = path.join(__dirname, '..', 'src', 'records')
if (!fs.existsSync(recordsDir)) {
	console.error(kleur.red("ERROR: Can't find records directory at path"), recordsDir)
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
		.slice(3)
		.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
		.trimStart()

fs.writeFileSync(
	filePath,
	`import { BaseRecord, defineMigrations, createRecordType, ID } from '@tldraw/tlstore'

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

export const ${lowerCaseName}TypeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})

/**
 * ${typeName}
 */
export interface ${typeName} extends BaseRecord<'${snakeCaseName}'> {}


export const ${typeName} = createRecordType<${typeName}>('${snakeCaseName}', {
	migrations: ${lowerCaseName}TypeMigrations,
}).withDefaultProperties(() => ({
}))

export type ${typeName}Id = ID<${typeName}>

`
)

console.log(kleur.green('Created new record type at path'), filePath)
