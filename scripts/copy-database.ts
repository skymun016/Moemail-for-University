import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync } from 'fs'
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

/**
 * 数据库复制脚本 - 从源数据库复制到目标数据库
 */
async function copyDatabase() {
  console.log('🔄 Database Copy Script')
  console.log('======================')

  // 检查环境变量
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN is required')
    process.exit(1)
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('❌ CLOUDFLARE_ACCOUNT_ID is required')
    process.exit(1)
  }

  // 读取当前数据库配置
  const wranglerPath = join(process.cwd(), 'wrangler.json')
  let targetDbName: string
  
  try {
    const wranglerContent = readFileSync(wranglerPath, 'utf-8')
    const config = JSON.parse(wranglerContent) as WranglerConfig
    targetDbName = config.d1_databases[0].database_name
    console.log(`🎯 Target database: ${targetDbName}`)
  } catch (error) {
    console.error('❌ Failed to read wrangler.json:', error)
    process.exit(1)
  }

  // 获取命令行参数：源数据库名称
  const args = process.argv.slice(2)
  const sourceDbName = args[0]

  if (!sourceDbName) {
    console.error('❌ Please provide source database name')
    console.error('Usage: tsx scripts/copy-database.ts <source-database-name>')
    console.error('Example: tsx scripts/copy-database.ts moemail-production')
    process.exit(1)
  }

  console.log(`📤 Source database: ${sourceDbName}`)

  try {
    // 步骤 1: 列出所有数据库，确认源数据库存在
    console.log('\n1. Checking available databases...')
    const { stdout: dbList } = await execAsync('npx wrangler d1 list')
    console.log('Available databases:')
    console.log(dbList)

    if (!dbList.includes(sourceDbName)) {
      console.error(`❌ Source database "${sourceDbName}" not found`)
      console.error('Please check the database name and try again')
      process.exit(1)
    }

    // 步骤 2: 导出源数据库
    console.log(`\n2. Exporting data from ${sourceDbName}...`)
    const exportCommand = `npx wrangler d1 export ${sourceDbName} --remote --output database-backup.sql`
    console.log(`Command: ${exportCommand}`)
    
    await execAsync(exportCommand)
    console.log('✅ Database exported to database-backup.sql')

    // 步骤 3: 导入到目标数据库
    console.log(`\n3. Importing data to ${targetDbName}...`)
    const importCommand = `npx wrangler d1 execute ${targetDbName} --remote --file database-backup.sql`
    console.log(`Command: ${importCommand}`)
    
    await execAsync(importCommand)
    console.log('✅ Database imported successfully')

    // 步骤 4: 验证导入结果
    console.log(`\n4. Verifying import...`)
    try {
      const { stdout: tableList } = await execAsync(`npx wrangler d1 execute ${targetDbName} --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`)
      console.log('✅ Tables in target database:')
      console.log(tableList)
    } catch (verifyError) {
      console.log('⚠️ Could not verify tables, but import may have succeeded')
    }

    console.log('\n🎉 Database copy completed successfully!')
    console.log('💡 You can now test your application')

  } catch (error: any) {
    console.error('❌ Database copy failed:', error.message)
    
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      console.error('\n💡 Possible solutions:')
      console.error('  1. Check if the source database name is correct')
      console.error('  2. Ensure you have access to both databases')
      console.error('  3. Verify your API token has D1 permissions')
    }
    
    process.exit(1)
  }
}

copyDatabase()
