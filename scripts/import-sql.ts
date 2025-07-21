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

/**
 * SQL 文件导入脚本
 */
async function importSQL() {
  console.log('📥 SQL Import Script')
  console.log('===================')

  // 检查环境变量
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN is required')
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

  // 获取 SQL 文件路径
  const args = process.argv.slice(2)
  const sqlFilePath = args[0] || 'database-backup.sql'

  if (!existsSync(sqlFilePath)) {
    console.error(`❌ SQL file not found: ${sqlFilePath}`)
    console.error('Usage: tsx scripts/import-sql.ts [sql-file-path]')
    console.error('Example: tsx scripts/import-sql.ts backup.sql')
    process.exit(1)
  }

  console.log(`📄 SQL file: ${sqlFilePath}`)

  try {
    // 检查文件内容
    const sqlContent = readFileSync(sqlFilePath, 'utf-8')
    const lines = sqlContent.split('\n').filter(line => line.trim()).length
    console.log(`📊 SQL file contains ${lines} non-empty lines`)

    // 导入 SQL 文件
    console.log(`\n🚀 Importing SQL to ${dbName}...`)
    const importCommand = `npx wrangler d1 execute ${dbName} --remote --file ${sqlFilePath}`
    console.log(`Command: ${importCommand}`)
    
    const { stdout, stderr } = await execAsync(importCommand)
    
    if (stdout) console.log('Output:', stdout)
    if (stderr) console.log('Stderr:', stderr)
    
    console.log('✅ SQL import completed')

    // 验证导入结果
    console.log(`\n🔍 Verifying import...`)
    try {
      const { stdout: tableList } = await execAsync(`npx wrangler d1 execute ${dbName} --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`)
      console.log('✅ Tables in database:')
      console.log(tableList)

      // 检查 user 表是否存在
      if (tableList.includes('user')) {
        console.log('✅ User table found!')
        
        // 检查用户数量
        const { stdout: userCount } = await execAsync(`npx wrangler d1 execute ${dbName} --remote --command "SELECT COUNT(*) as count FROM user;"`)
        console.log('👥 User count:', userCount)
      } else {
        console.log('⚠️ User table not found in import')
      }

    } catch (verifyError) {
      console.log('⚠️ Could not verify import, but it may have succeeded')
    }

    console.log('\n🎉 Import process completed!')
    console.log('💡 You can now test your application')

  } catch (error: any) {
    console.error('❌ SQL import failed:', error.message)
    
    if (error.message.includes('syntax error')) {
      console.error('\n💡 SQL syntax error detected:')
      console.error('  1. Check if the SQL file is valid SQLite format')
      console.error('  2. Ensure the file encoding is UTF-8')
      console.error('  3. Try importing a smaller portion first')
    }
    
    process.exit(1)
  }
}

importSQL()
