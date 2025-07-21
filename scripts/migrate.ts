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

async function migrate() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2)
    const mode = args[0]

    if (!mode || !['local', 'remote'].includes(mode)) {
      console.error('Error: Please specify mode (local or remote)')
      process.exit(1)
    }

    // Read wrangler.json
    const wranglerPath = join(process.cwd(), 'wrangler.json')
    let wranglerContent: string
    
    try {
      wranglerContent = readFileSync(wranglerPath, 'utf-8')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Generate migrations
    console.log('Generating migrations...')
    try {
      const { stdout: generateOutput, stderr: generateError } = await execAsync('npx drizzle-kit generate')
      if (generateOutput) console.log('Generate output:', generateOutput)
      if (generateError && generateError.trim()) console.log('Generate stderr:', generateError)
    } catch (generateErr: any) {
      console.error('Failed to generate migrations:', generateErr.message)
      throw generateErr
    }

    // Applying migrations
    console.log(`Applying migrations to ${mode} database: ${dbName}`)

    // For Wrangler 4.x, we might need to use different command format
    const command = mode === 'remote'
      ? `npx wrangler d1 migrations apply ${dbName} --remote`
      : `npx wrangler d1 migrations apply ${dbName} --local`

    console.log(`Executing command: ${command}`)
    console.log(`Environment check:`)
    console.log(`- CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? 'Set' : 'Not set'}`)
    console.log(`- CLOUDFLARE_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID ? 'Set' : 'Not set'}`)

    try {
      const { stdout: migrateOutput, stderr: migrateError } = await execAsync(command, {
        env: process.env,
        timeout: 60000 // 60 seconds timeout
      })

      console.log('Migration output:', migrateOutput || 'No output')
      if (migrateError && migrateError.trim()) {
        console.log('Migration stderr:', migrateError)
      }

    } catch (migrateErr: any) {
      console.error('Failed to apply migrations:')
      console.error('- Command:', migrateErr.cmd || command)
      console.error('- Exit code:', migrateErr.code)
      console.error('- Signal:', migrateErr.signal)
      console.error('- Stdout:', migrateErr.stdout || 'No stdout')
      console.error('- Stderr:', migrateErr.stderr || 'No stderr')
      console.error('- Error message:', migrateErr.message)
      throw migrateErr
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()