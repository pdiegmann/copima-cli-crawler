#!/usr/bin/env node

// Debug script to test GitLab GraphQL connection
import https from "https"
import fetch from "node-fetch"

const baseUrl = "https://git.hnnl.eu"
const accessToken = "6ddd12445d257e18b7358f37c29a1a8a7efb17accd4b5fa726efa7b038748587"

// Create HTTPS agent that ignores SSL certificate issues for development/testing
const agent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates
})

async function testConnection() {
  console.log("🔍 Testing GitLab GraphQL connection...")
  console.log(`Host: ${baseUrl}`)
  console.log(`Token: ${accessToken.substring(0, 10)}...`)

  // Test 1: Basic host connectivity
  console.log("\n1️⃣ Testing basic host connectivity...")
  try {
    const response = await fetch(baseUrl, { method: 'HEAD', agent })
    console.log(`✅ Host reachable: ${response.status} ${response.statusText}`)
  } catch (error) {
    console.log(`❌ Host not reachable: ${error.message}`)
    return
  }

  // Test 2: GraphQL endpoint with different paths
  const endpoints = [
    "/api/graphql",
    "/api/v4/graphql",
    "/graphql"
  ]

  for (const endpoint of endpoints) {
    const fullUrl = `${baseUrl}${endpoint}`
    console.log(`\n2️⃣ Testing GraphQL endpoint: ${fullUrl}`)

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: "{ __schema { queryType { name } } }"
        }),
        agent: agent,
      })

      console.log(`Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ GraphQL endpoint working at ${endpoint}`)
        console.log("Response:", JSON.stringify(data, null, 2))
        return
      } else {
        const text = await response.text()
        console.log(`❌ GraphQL failed at ${endpoint}: ${text}`)
      }
    } catch (error) {
      console.log(`❌ Connection error at ${endpoint}: ${error.message}`)
    }
  }

  // Test 3: Try REST API to verify token works
  console.log("\n3️⃣ Testing REST API to verify token...")
  try {
    const response = await fetch(`${baseUrl}/api/v4/user`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      agent: agent,
    })

    console.log(`REST API Status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const user = await response.json()
      console.log(`✅ REST API working. User: ${user.username || user.name}`)
    } else {
      const text = await response.text()
      console.log(`❌ REST API failed: ${text}`)
    }
  } catch (error) {
    console.log(`❌ REST API error: ${error.message}`)
  }

  // Test 4: Check GitLab version to understand GraphQL availability
  console.log("\n4️⃣ Checking GitLab version...")
  try {
    const response = await fetch(`${baseUrl}/api/v4/version`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      agent: agent,
    })

    if (response.ok) {
      const version = await response.json()
      console.log(`GitLab version: ${version.version || 'unknown'}`)
    } else {
      console.log(`Version endpoint returned: ${response.status}`)
    }
  } catch (error) {
    console.log(`Version check failed: ${error.message}`)
  }
}

testConnection().catch(console.error)
