import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jgkievbnncwqixyzblzc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna2lldmJubmN3cWl4eXpibHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODYyOTksImV4cCI6MjA4MDk2MjI5OX0.4z4oRwpI5kHaDUpYOgbQA9ISgjyOPjDmx_BK_3nWQUg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
