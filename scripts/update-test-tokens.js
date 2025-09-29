#!/usr/bin/env bun
/* eslint-env node */
/* global console, process */

/**
 * Script to update test configuration with fresh OAuth2 tokens
 * This gets fresh tokens from the OAuth flow and updates the test config
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import * as yaml from 'js-yaml'

async function updateTestTokens() {
  console.log('🔄 Getting fresh OAuth2 tokens...')

  try {
    // Run OAuth flow to get fresh tokens
    /* eslint-disable sonarjs/no-os-command-from-path */
    const authOutput = execSync(
      'NODE_TLS_REJECT_UNAUTHORIZED=0 timeout 60 bun run src/bin/cli.ts auth --config examples/oauth2-config.yml --provider gitlab --timeout 50',
      { encoding: 'utf8', stdio: 'pipe' }
    )
    /* eslint-enable sonarjs/no-os-command-from-path */

    // Extract tokens from output
    const accessTokenMatch = authOutput.match(/Access Token: ([a-f0-9]+)\.\.\./)
    const refreshTokenMatch = authOutput.match(/Refresh Token: ([a-f0-9]+)\.\.\./)

    if (!accessTokenMatch || !refreshTokenMatch) {
      throw new Error('Could not extract tokens from OAuth output')
    }

    const accessToken = accessTokenMatch[1]
    const refreshToken = refreshTokenMatch[1]

    console.log(`✅ Got tokens: ${accessToken.substring(0, 8)}... / ${refreshToken.substring(0, 8)}...`)

    // Read test configuration
    const testConfigPath = 'examples/test-configs/basic-test.yaml'
    const testConfig = yaml.load(readFileSync(testConfigPath, 'utf8'))

    // Update tokens
    testConfig.gitlab.accessToken = accessToken
    testConfig.gitlab.refreshToken = refreshToken

    // Write back configuration
    writeFileSync(testConfigPath, yaml.dump(testConfig, {
      quotingType: '"',
      forceQuotes: true
    }))

    console.log('✅ Updated test configuration with fresh tokens')
    console.log('🧪 You can now run: bun run test:e2e:basic')

  } catch (error) {
    console.error('❌ Failed to update tokens:', error.message)
    process.exit(1)
  }
}

if (import.meta.main) {
  await updateTestTokens()
}
