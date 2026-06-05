import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

export type Question = {
  id: string
  text: string
  likes: number
  event_id?: string
  created_at: string
}

export type AttendanceRow = {
  id: string
  event_id?: string
  name: string
  hospital: string
  last_name: string
  first_name: string
  position_title: string
  email: string
  phone: string
  registered: boolean
  checked_in: boolean
  created_at: string
}

export type EventTopic = {
  id: string
  title: string
  event_date: string
  program_image_url: string
  is_active: boolean
  created_at: string
  archived_at: string | null
}

export async function getActiveEvent(): Promise<EventTopic | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getActiveEvent:', error.message)
    return null
  }

  return data
}

export async function getEvents(): Promise<EventTopic[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getEvents:', error.message)
    return []
  }

  return data || []
}

export async function getSetting(key: string): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value || ''
}

export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('settings').upsert({ key, value })
  return { error: error?.message ?? null }
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (!line.trim()) continue
    const cols: string[] = []
    let inQ = false, cur = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}
