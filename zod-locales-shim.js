// Custom shim to only load the English locale instead of all 47 locales
// This dramatically reduces bundle size while keeping error messages readable
export { en } from 'zod/v4/locales/en.js'

// Export en as default for any code that might use it
export { en as default } from 'zod/v4/locales/en.js'
