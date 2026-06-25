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
  phone_digits?: string
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
  cert_template_url: string
  cert_name_x: number
  cert_name_y: number
  cert_font_size: number
  cert_font_color: string
  has_quiz: boolean
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correct_index: number
  created_at: string
}

export type QuizResult = {
  id: string
  event_id: string
  phone: string
  name: string | null
  score: number
  total: number
  passed: boolean
  attempt_num: number
  created_at: string
}

export type CertificateIssue = {
  id: string
  attendance_id: string | null
  event_id: string | null
  participant_name: string
  phone: string
  issued_at: string
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

export async function getLatestEvent(): Promise<EventTopic | null> {
  const active = await getActiveEvent()
  if (active) return active
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
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
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
  return { error: error?.message ?? null }
}

export function normalizePhoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '')
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
