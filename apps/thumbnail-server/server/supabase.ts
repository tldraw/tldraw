import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = 'https://duxexqowwuntlpwwhtoy.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

export { supabase }
