# Q&A Platform

Асуулт цуглуулах, like өгөх, топ 5 харуулах, ирц бүртгэх систем.

## Хурдан эхлэх

### 1. Supabase тохируулах

[supabase.com](https://supabase.com) дээр project үүсгэж, SQL Editor-т дараахыг ажиллуул:

```sql
create table questions (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  likes int default 0,
  created_at timestamp default now()
);

create table question_likes (
  question_id uuid references questions(id) on delete cascade,
  user_token text not null,
  primary key (question_id, user_token)
);

create table attendance (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  registered boolean default true,
  checked_in boolean default false,
  created_at timestamp default now()
);
```

### 2. Environment variables

`.env.example` файлыг `.env.local` болгож хуулаад утгуудыг оруул:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_ADMIN_PW=өөрийн_нууц_үг
```

### 3. Локал ажиллуулах

```bash
npm install
npm run dev
```

### 4. Vercel дээр байршуулах

1. GitHub-д repository үүсгэж код оруул
2. [vercel.com](https://vercel.com) → New Project → GitHub repo сонго
3. Environment variables нэм (дээрх 3 утгыг)
4. Deploy!

## Хуудсууд

| URL | Тайлбар |
|-----|---------|
| `/questions` | Асуулт илгээх + like дарах |
| `/top` | Топ 5 асуулт (дэлгэц дээр харуулах) |
| `/admin` | Ирц бүртгэл (нууц үгтэй) |

## Хүний тоо

- Vercel Free: өдөрт хязгааргүй request
- Supabase Free: 500MB өгөгдөл, 2GB bandwidth/сар → 500 хүн/өдөр чөлөөтэй
