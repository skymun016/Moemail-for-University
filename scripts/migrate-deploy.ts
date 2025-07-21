import { readFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

// Add Node.js types
declare const process: {
  argv: string[]
  exit: (code: number) => never
  env: Record<string, string | undefined>
  cwd: () => string
}

interface D1Database {
  binding: string
  database_name: string
  database_id: string
}

interface WranglerConfig {
  d1_databases: D1Database[]
}

/**
 * Deployment-specific migration script that gracefully handles "no changes" scenarios
 */
async function migrateForDeployment() {
  try {
    console.log('🚀 Deployment Migration Check')
    
    // Read wrangler.json
    const wranglerPath = join(process.cwd(), 'wrangler.json')
    let wranglerContent: string
    
    try {
      wranglerContent = readFileSync(wranglerPath, 'utf-8')
    } catch (error) {
      console.error('Error: wrangler.json not found')
      process.exit(1)
    }

    // Parse wrangler.json
    const config = JSON.parse(wranglerContent) as WranglerConfig
    
    if (!config.d1_databases?.[0]?.database_name) {
      console.error('Error: Database name not found in wrangler.json')
      process.exit(1)
    }

    const dbName = config.d1_databases[0].database_name
    console.log(`Database: ${dbName}`)

    // Check environment variables
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required')
      process.exit(1)
    }
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
      console.error('Error: CLOUDFLARE_ACCOUNT_ID environment variable is required')
      process.exit(1)
    }

    // Step 1: Generate migrations and check if there are changes
    console.log('Checking for schema changes...')
    try {
      const { stdout: generateOutput } = await execAsync('npx drizzle-kit generate')
      
      if (generateOutput && generateOutput.includes('No schema changes, nothing to migrate')) {
        console.log('✅ No schema changes detected')
        console.log('✅ Database is already up to date')
        console.log('🎉 Migration check completed - no action needed!')
        process.exit(0) // Success exit
      }
      
      if (generateOutput) {
        console.log('📝 Schema changes detected:', generateOutput)
      }
      
    } catch (generateErr: any) {
      console.error('Failed to check schema changes:', generateErr.message)
      // If we can't generate, we should fail the deployment
      process.exit(1)
    }
    
    // Step 2: If we reach here, there are migrations to apply
    console.log('Applying database migrations...')
    
    try {
      const command = `npx wrangler d1 migrations apply ${dbName} --remote`
      console.log(`Executing: ${command}`)
      
      const { stdout: migrateOutput, stderr: migrateError } = await execAsync(command, {
        timeout: 120000 // 2 minutes
      })
      
      console.log('✅ Migrations applied successfully!')
      if (migrateOutput) console.log('Output:', migrateOutput)
      if (migrateError && migrateError.trim()) console.log('Stderr:', migrateError)
      
    } catch (migrateErr: any) {
      const stdout = migrateErr.stdout || ''
      const stderr = migrateErr.stderr || ''
      const fullOutput = stdout + stderr
      
      // Handle "no migrations to apply" as success
      if (fullOutput.includes('No migrations to apply') || 
          fullOutput.includes('already applied') || 
          fullOutput.includes('up to date') ||
          fullOutput.includes('No new migrations')) {
        console.log('✅ Database is already up to date!')
        console.log('🎉 Migration completed successfully!')
        process.exit(0) // Success
      }
      
      // Handle authentication errors
      if (fullOutput.includes('authentication') || 
          fullOutput.includes('unauthorized') || 
          fullOutput.includes('permission') ||
          fullOutput.includes('API token')) {
        console.error('❌ Authentication error!')
        console.error('Please verify CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID')
        process.exit(1)
      }
      
      // Other errors
      console.error('❌ Migration failed:')
      console.error('Exit code:', migrateErr.code)
      console.error('Stdout:', stdout || 'None')
      console.error('Stderr:', stderr || 'None')
      process.exit(1)
    }

    console.log('🎉 Deployment migration completed successfully!')

  } catch (error) {
    console.error('Deployment migration failed:', error)
    process.exit(1)
  }
}

migrateForDeployment()
