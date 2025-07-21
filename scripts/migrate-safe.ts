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
 * Safe migration script that handles existing databases gracefully
 */
async function migrateSafe() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2)
    const mode = args[0]

    if (!mode || !['local', 'remote'].includes(mode)) {
      console.error('Error: Please specify mode (local or remote)')
      process.exit(1)
    }

    // Check if we have required environment variables for remote mode
    if (mode === 'remote') {
      if (!process.env.CLOUDFLARE_API_TOKEN) {
        console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required for remote migrations')
        process.exit(1)
      }
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
        console.error('Error: CLOUDFLARE_ACCOUNT_ID environment variable is required for remote migrations')
        process.exit(1)
      }
    }

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

    console.log(`🔍 Safe migration for ${mode} database: ${dbName}`)

    // Step 1: Check if database exists and has migrations
    if (mode === 'remote') {
      console.log('Checking existing migrations...')
      try {
        const { stdout: existingMigrations } = await execAsync(`npx wrangler d1 migrations list ${dbName} --remote`, {
          env: process.env,
          timeout: 30000
        })
        
        if (existingMigrations && existingMigrations.trim()) {
          console.log('📋 Existing migrations found:')
          console.log(existingMigrations)
          
          // If migrations exist, we should be more careful
          console.log('⚠️ Database already has migrations. Checking if new migrations are needed...')
        } else {
          console.log('📋 No existing migrations found, this appears to be a fresh database')
        }
      } catch (listError: any) {
        console.log('ℹ️ Could not list existing migrations (this is normal for new databases)')
        console.log('Error:', listError.message)
      }
    }

    // Step 2: Generate migrations (always safe to do)
    console.log('Generating migrations...')
    let hasNewMigrations = false
    try {
      const { stdout: generateOutput } = await execAsync('npx drizzle-kit generate')
      if (generateOutput && generateOutput.trim()) {
        console.log('✅ Migrations generated:', generateOutput)

        // Check if there are actually new migrations to apply
        if (generateOutput.includes('No schema changes, nothing to migrate')) {
          console.log('ℹ️ No schema changes detected, database is already up to date')
          hasNewMigrations = false
        } else {
          hasNewMigrations = true
        }
      } else {
        console.log('ℹ️ No new migrations to generate')
        hasNewMigrations = false
      }
    } catch (generateErr: any) {
      console.error('Failed to generate migrations:', generateErr.message)
      throw generateErr
    }

    // If no new migrations, we can skip the apply step
    if (!hasNewMigrations) {
      console.log('✅ Database is already up to date! No migrations needed.')
      console.log('🎉 Safe migration completed successfully - nothing to do!')
      return
    }
    
    // Step 3: Apply migrations with better error handling
    console.log(`Applying migrations to ${mode} database...`)
    
    const command = `npx wrangler d1 migrations apply ${dbName} --${mode}`
    console.log(`Command: ${command}`)
    
    try {
      const { stdout: migrateOutput, stderr: migrateError } = await execAsync(command, {
        env: process.env,
        timeout: 120000 // 2 minutes timeout for migrations
      })
      
      console.log('✅ Migration completed successfully!')
      if (migrateOutput) console.log('Output:', migrateOutput)
      if (migrateError && migrateError.trim()) console.log('Stderr:', migrateError)
      
    } catch (migrateErr: any) {
      const stdout = migrateErr.stdout || ''
      const stderr = migrateErr.stderr || ''
      const fullOutput = stdout + stderr
      
      // Handle common scenarios gracefully
      if (fullOutput.includes('No migrations to apply') || 
          fullOutput.includes('already applied') || 
          fullOutput.includes('up to date') ||
          fullOutput.includes('No new migrations')) {
        console.log('✅ Database is already up to date!')
        console.log('ℹ️ No new migrations were needed')
        return // Success case
      }
      
      // Handle authentication errors
      if (fullOutput.includes('authentication') || 
          fullOutput.includes('unauthorized') || 
          fullOutput.includes('permission') ||
          fullOutput.includes('API token')) {
        console.error('❌ Authentication error!')
        console.error('Please check:')
        console.error('  - CLOUDFLARE_API_TOKEN is valid')
        console.error('  - Token has D1 database permissions')
        console.error('  - CLOUDFLARE_ACCOUNT_ID is correct')
        throw migrateErr
      }
      
      // Handle other errors
      console.error('❌ Migration failed with error:')
      console.error('Exit code:', migrateErr.code)
      console.error('Stdout:', stdout || 'None')
      console.error('Stderr:', stderr || 'None')
      
      throw migrateErr
    }

  } catch (error) {
    console.error('Safe migration failed:', error)
    process.exit(1)
  }
}

migrateSafe()
