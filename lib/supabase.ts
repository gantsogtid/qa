import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
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

export async function getSetting(key: string): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value || ''
}

export async function setSetting(key: string, value: string): Promise<void> {
  await supabase.from('settings').update({ value }).eq('key', key)
}
