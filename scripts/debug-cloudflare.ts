import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Debug script to check Cloudflare API authentication and permissions
 */
async function debugCloudflare() {
  console.log('🔍 Cloudflare Authentication Debug')
  console.log('==================================')

  // Check environment variables
  console.log('\n1. Environment Variables Check:')
  console.log(`- CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? '✅ Set' : '❌ Not set'}`)
  console.log(`- CLOUDFLARE_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}`)
  
  if (process.env.CLOUDFLARE_API_TOKEN) {
    const tokenLength = process.env.CLOUDFLARE_API_TOKEN.length
    const tokenPreview = process.env.CLOUDFLARE_API_TOKEN.substring(0, 8) + '...'
    console.log(`- Token length: ${tokenLength} characters`)
    console.log(`- Token preview: ${tokenPreview}`)
  }

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ CLOUDFLARE_API_TOKEN is not set!')
    console.error('Please set this environment variable with a valid Cloudflare API token.')
    return
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('\n❌ CLOUDFLARE_ACCOUNT_ID is not set!')
    console.error('Please set this environment variable with your Cloudflare account ID.')
    return
  }

  // Test Wrangler authentication
  console.log('\n2. Testing Wrangler Authentication:')
  try {
    const { stdout: whoamiOutput } = await execAsync('npx wrangler whoami', {
      timeout: 30000
    })
    console.log('✅ Wrangler authentication successful:')
    console.log(whoamiOutput)
  } catch (whoamiError: any) {
    console.error('❌ Wrangler authentication failed:')
    console.error(whoamiError.message)
    console.error('\nThis indicates an issue with your API token.')
  }

  // Test account access
  console.log('\n3. Testing Account Access:')
  try {
    const { stdout: accountOutput } = await execAsync('npx wrangler account list', {
      timeout: 30000
    })
    console.log('✅ Account access successful:')
    console.log(accountOutput)
  } catch (accountError: any) {
    console.error('❌ Account access failed:')
    console.error(accountError.message)
  }

  // Test D1 database access
  console.log('\n4. Testing D1 Database Access:')
  try {
    const { stdout: d1Output } = await execAsync('npx wrangler d1 list', {
      timeout: 30000
    })
    console.log('✅ D1 database access successful:')
    console.log(d1Output)
  } catch (d1Error: any) {
    console.error('❌ D1 database access failed:')
    console.error(d1Error.message)
  }

  // Test Pages access
  console.log('\n5. Testing Pages Access:')
  try {
    const { stdout: pagesOutput } = await execAsync('npx wrangler pages project list', {
      timeout: 30000
    })
    console.log('✅ Pages access successful:')
    console.log(pagesOutput)
  } catch (pagesError: any) {
    console.error('❌ Pages access failed:')
    console.error(pagesError.message)
    console.error('\nThis is likely the cause of your deployment failure.')
  }

  console.log('\n🎯 Debug Summary:')
  console.log('If you see ❌ errors above, those need to be fixed for deployment to work.')
  console.log('\nCommon solutions:')
  console.log('1. Generate a new API token at: https://dash.cloudflare.com/profile/api-tokens')
  console.log('2. Ensure the token has these permissions:')
  console.log('   - Cloudflare Pages:Edit')
  console.log('   - D1:Edit')
  console.log('   - Account:Read')
  console.log('3. Update your GitHub repository secrets with the new token')
  console.log('4. Verify your Account ID is correct')
}

debugCloudflare().catch(console.error)
