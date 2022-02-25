import { BuildOptions } from 'esbuild'
import path from 'path'

const config: BuildOptions = {
  platform: 'browser',
  entryPoints: [path.resolve('src/main/main.ts')],
  bundle: true,
  target: 'chrome94', // electron version target
  sourcemap: true,
}

export default config
