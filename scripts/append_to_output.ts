import { appendFileSync, readFileSync } from 'fs'

console.log('Appending to output file...')
appendFileSync(process.env.GITHUB_OUTPUT!, `the_output=hahaha\n`)

console.log('Done!')
console.log('output:', process.env.GITHUB_OUTPUT)
console.log(readFileSync(process.env.GITHUB_OUTPUT!, 'utf8'))
