import { BuildOptions } from 'esbuild'
import path from 'path'

const config: BuildOptions = {
  platform: 'browser',
  entryPoints: [path.resolve('src/renderer/index.tsx')],
  bundle: true,
  target: 'chrome94', // electron version target
}

export default config
