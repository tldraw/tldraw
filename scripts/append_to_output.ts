import { appendFileSync } from 'fs'

appendFileSync(process.env.GITHUB_OUTPUT!, `the_output=hahaha lol ok\n`)
