import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

interface D1Database {
  binding: string
  database_name: string
  database_id: string
}

interface WranglerConfig {
  d1_databases: D1Database[]
}

// 定义必需的表和它们的关键字段
const REQUIRED_TABLES = {
  'user': ['id', 'email', 'name'],
  'account': ['id', 'userId', 'type'],
  'role': ['id', 'name'],
  'user_role': ['userId', 'roleId'],
  'email': ['id', 'address'],
  'message': ['id', 'emailId', 'subject'],
  'api_keys': ['id', 'userId', 'key'],
  'webhook': ['id', 'userId', 'url']
}

/**
 * 智能数据库部署脚本
 * 检测数据库状态，决定是否需要导入或迁移
 */
async function smartDatabaseDeploy() {
  console.log('🧠 Smart Database Deployment')
  console.log('============================')

  // 检查环境变量
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN is required')
    process.exit(1)
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('❌ CLOUDFLARE_ACCOUNT_ID is required')
    process.exit(1)
  }

  // 读取数据库配置
  const wranglerPath = join(process.cwd(), 'wrangler.json')
  let dbName: string
  
  try {
    const wranglerContent = readFileSync(wranglerPath, 'utf-8')
    const config = JSON.parse(wranglerContent) as WranglerConfig
    dbName = config.d1_databases[0].database_name
    console.log(`🎯 Target database: ${dbName}`)
  } catch (error) {
    console.error('❌ Failed to read wrangler.json:', error)
    process.exit(1)
  }

  try {
    // 步骤 1: 检查数据库是否存在
    console.log('\n1. Checking if database exists...')
    const { stdout: dbList } = await execAsync('npx wrangler d1 list')
    
    if (!dbList.includes(dbName)) {
      console.error(`❌ Database "${dbName}" not found`)
      console.error('Please create the database first or check the configuration')
      process.exit(1)
    }
    console.log('✅ Database exists')

    // 步骤 2: 检查数据库表结构
    console.log('\n2. Analyzing database structure...')
    let existingTables: string[] = []
    let databaseIsEmpty = true
    
    try {
      const { stdout: tableQuery } = await execAsync(
        `npx wrangler d1 execute ${dbName} --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`
      )
      
      // 解析表名
      const lines = tableQuery.split('\n').filter(line => line.trim())
      existingTables = lines.filter(line => 
        line && !line.includes('name') && !line.includes('---') && line.trim()
      ).map(line => line.trim())
      
      databaseIsEmpty = existingTables.length === 0
      
      console.log(`📊 Found ${existingTables.length} existing tables:`, existingTables)
      
    } catch (tableError) {
      console.log('⚠️ Could not query tables, assuming empty database')
      databaseIsEmpty = true
    }

    // 步骤 3: 检查表完整性
    let tablesComplete = false
    if (!databaseIsEmpty) {
      console.log('\n3. Checking table completeness...')
      
      const requiredTableNames = Object.keys(REQUIRED_TABLES)
      const missingTables = requiredTableNames.filter(table => !existingTables.includes(table))
      
      if (missingTables.length === 0) {
        console.log('✅ All required tables present')
        
        // 检查关键表的字段
        try {
          const { stdout: userTableInfo } = await execAsync(
            `npx wrangler d1 execute ${dbName} --remote --command "PRAGMA table_info(user);"`
          )
          
          if (userTableInfo.includes('email') && userTableInfo.includes('name')) {
            console.log('✅ User table structure looks good')
            tablesComplete = true
          } else {
            console.log('⚠️ User table structure incomplete')
          }
        } catch (structureError) {
          console.log('⚠️ Could not verify table structure')
        }
      } else {
        console.log(`❌ Missing tables: ${missingTables.join(', ')}`)
      }
    }

    // 步骤 4: 决定执行策略
    console.log('\n4. Determining deployment strategy...')
    
    if (databaseIsEmpty) {
      console.log('📋 Strategy: FULL IMPORT (Database is empty)')
      await performFullImport(dbName)
    } else if (!tablesComplete) {
      console.log('📋 Strategy: REPAIR IMPORT (Tables incomplete)')
      await performRepairImport(dbName)
    } else {
      console.log('📋 Strategy: SKIP (Database is complete)')
      console.log('✅ Database is already properly configured')
      
      // 可选：检查用户数量
      try {
        const { stdout: userCount } = await execAsync(
          `npx wrangler d1 execute ${dbName} --remote --command "SELECT COUNT(*) as count FROM user;"`
        )
        console.log(`👥 Current user count: ${userCount.split('\n').find(line => line.match(/\d+/)) || 'Unknown'}`)
      } catch (countError) {
        console.log('ℹ️ Could not check user count')
      }
    }

    console.log('\n🎉 Smart database deployment completed!')

  } catch (error: any) {
    console.error('❌ Smart database deployment failed:', error.message)
    process.exit(1)
  }
}

/**
 * 执行完整导入
 */
async function performFullImport(dbName: string) {
  console.log('\n🔄 Performing full database import...')
  
  // 首先尝试运行迁移
  try {
    console.log('Trying migrations first...')
    await execAsync('npx drizzle-kit generate')
    await execAsync(`npx wrangler d1 migrations apply ${dbName} --remote`)
    console.log('✅ Migrations applied successfully')
    return
  } catch (migrationError) {
    console.log('⚠️ Migrations failed, trying backup import...')
  }
  
  // 如果迁移失败，尝试导入备份
  await tryBackupImport(dbName)
}

/**
 * 执行修复导入
 */
async function performRepairImport(dbName: string) {
  console.log('\n🔧 Performing repair import...')
  
  // 尝试运行缺失的迁移
  try {
    console.log('Trying to apply missing migrations...')
    await execAsync(`npx wrangler d1 migrations apply ${dbName} --remote`)
    console.log('✅ Repair migrations applied')
    return
  } catch (repairError) {
    console.log('⚠️ Repair migrations failed, trying backup import...')
  }
  
  // 如果修复失败，尝试导入备份
  await tryBackupImport(dbName)
}

/**
 * 尝试导入备份文件
 */
async function tryBackupImport(dbName: string) {
  const backupFiles = [
    'database-schema.sql',    // 我们的标准 schema
    'database-backup.sql',
    'backup.sql',
    'init.sql',
    'schema.sql'
  ]

  for (const backupFile of backupFiles) {
    if (existsSync(backupFile)) {
      console.log(`📥 Found backup file: ${backupFile}`)
      try {
        const { stdout, stderr } = await execAsync(`npx wrangler d1 execute ${dbName} --remote --file ${backupFile}`)

        if (stdout) console.log('Import output:', stdout)
        if (stderr) console.log('Import stderr:', stderr)

        console.log(`✅ Successfully imported ${backupFile}`)

        // 验证导入结果
        try {
          const { stdout: tableCheck } = await execAsync(
            `npx wrangler d1 execute ${dbName} --remote --command "SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`
          )
          console.log('📊 Import verification:', tableCheck)
        } catch (verifyError) {
          console.log('ℹ️ Could not verify import, but it may have succeeded')
        }

        return
      } catch (importError: any) {
        console.log(`⚠️ Failed to import ${backupFile}:`, importError.message)
      }
    }
  }

  console.error('❌ No valid backup files found and migrations failed')
  console.error('💡 Available options:')
  console.error('  1. Place a database-schema.sql file in the project root')
  console.error('  2. Fix the Drizzle migrations')
  console.error('  3. Provide a database backup file')
  process.exit(1)
}

smartDatabaseDeploy()
