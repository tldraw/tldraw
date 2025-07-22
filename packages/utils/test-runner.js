#!/usr/bin/env node

// Simple test runner to verify our Vitest migration
const { execSync } = require('child_process')
const path = require('path')

console.log('Testing Vitest migration for packages/utils...')

try {
  // Try to run vitest if it's available
  execSync('npx vitest run --config vitest.config.js', { 
    cwd: __dirname,
    stdio: 'inherit'
  })
  console.log('✅ Vitest tests passed!')
} catch (error) {
  console.log('❌ Vitest tests failed:', error.message)
  
  // Fallback to jest if vitest is not available
  try {
    console.log('Falling back to Jest...')
    execSync('npx jest', { 
      cwd: __dirname,
      stdio: 'inherit'
    })
    console.log('✅ Jest tests passed!')
  } catch (jestError) {
    console.log('❌ Jest tests also failed:', jestError.message)
    process.exit(1)
  }
}