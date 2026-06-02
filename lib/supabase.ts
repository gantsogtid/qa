import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Question = {
  id: string
  text: string
  likes: number
  created_at: string
}

export type AttendanceRow = {
  id: string
  name: string
  registered: boolean
  checked_in: boolean
  created_at: string
}
