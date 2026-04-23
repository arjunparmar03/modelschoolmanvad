import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('--- Supabase Diagnostic ---')
console.log('URL:', supabaseUrl)
console.log('Key (start):', supabaseKey?.substring(0, 15) + '...')

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('\n1. Testing basic connection...')
  const { data: tableData, error: tableError } = await supabase.from('cms_data').select('count', { count: 'exact', head: true })
  
  if (tableError) {
    if (tableError.message.includes('relation "cms_data" does not exist')) {
      console.error('❌ Table "cms_data" does NOT exist. You must run the SQL script in Supabase SQL Editor.')
    } else {
      console.error('❌ Supabase error:', tableError.message)
    }
  } else {
    console.log('✅ Table "cms_data" exists!')
  }

  console.log('\n2. Testing bucket "school-images"...')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  
  if (bucketError) {
    console.error('❌ Storage error:', bucketError.message)
  } else {
    const exists = buckets.find(b => b.name === 'school-images')
    if (exists) {
      console.log('✅ Bucket "school-images" exists!')
    } else {
      console.error('❌ Bucket "school-images" does NOT exist. Please create it in Supabase Storage.')
    }
  }
}

test()
