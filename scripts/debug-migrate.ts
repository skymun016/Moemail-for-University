import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

// Simple debug migration script for troubleshooting
async function debugMigrate() {
  try {
    console.log('🔍 Debug Migration Script')
    console.log('========================')
    
    // Check Wrangler version
    console.log('\n1. Checking Wrangler version...')
    try {
      const version = execSync('npx wrangler --version', { encoding: 'utf8' })
      console.log('✅ Wrangler version:', version.trim())
    } catch (error) {
      console.error('❌ Failed to get Wrangler version:', error)
      return
    }
    
    // Check environment variables
    console.log('\n2. Checking environment variables...')
    console.log('- CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? '✅ Set' : '❌ Not set')
    console.log('- CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ Set' : '❌ Not set')
    
    // Check wrangler.json
    console.log('\n3. Checking wrangler.json...')
    const wranglerPath = join(process.cwd(), 'wrangler.json')
    try {
      const wranglerContent = readFileSync(wranglerPath, 'utf-8')
      const config = JSON.parse(wranglerContent)
      console.log('✅ wrangler.json found')
      console.log('- Database name:', config.d1_databases?.[0]?.database_name || 'Not found')
      console.log('- Database ID:', config.d1_databases?.[0]?.database_id || 'Not found')
    } catch (error) {
      console.error('❌ Failed to read wrangler.json:', error)
      return
    }
    
    // Check if we can list databases
    console.log('\n4. Testing Wrangler D1 connection...')
    try {
      const dbList = execSync('npx wrangler d1 list', { encoding: 'utf8' })
      console.log('✅ Can connect to Cloudflare D1')
      console.log('Available databases:', dbList)
    } catch (error: any) {
      console.error('❌ Failed to connect to D1:', error.message)
      console.error('This might be the root cause of migration failures')
    }
    
    // Check migrations directory
    console.log('\n5. Checking migrations...')
    try {
      const migrationsDir = join(process.cwd(), 'drizzle')
      const files = require('fs').readdirSync(migrationsDir)
      const sqlFiles = files.filter((f: string) => f.endsWith('.sql'))
      console.log('✅ Found', sqlFiles.length, 'migration files')
      sqlFiles.forEach((file: string) => console.log('  -', file))
    } catch (error) {
      console.error('❌ Failed to read migrations directory:', error)
    }
    
    console.log('\n🎯 Debug complete!')
    console.log('If you see any ❌ above, those are likely the cause of migration failures.')
    
  } catch (error) {
    console.error('Debug script failed:', error)
  }
}

debugMigrate()
