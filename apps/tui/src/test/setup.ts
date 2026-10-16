import { installDomGlobals } from '../bootstrap/dom'

// tldraw reads `window` at import time, so the DOM must exist before any test file's imports run.
installDomGlobals()
