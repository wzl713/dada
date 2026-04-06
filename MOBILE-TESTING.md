# Dada Mobile Testing Guide

## 1. Local development

```powershell
cd C:\Users\34872\Desktop\Dada
npm install
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173`.

## 2. Prepare Supabase

1. Open your Supabase project.
2. Run `supabase-schema.sql` in the SQL Editor.
3. Make sure `.env.local` contains:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Deploy to Vercel

1. Push this project to GitHub.
2. Go to https://vercel.com and import the repository.
3. Add the same two environment variables from `.env.local`.
4. Deploy.

`vercel.json` is already included, so React Router refreshes will work.

## 4. Send to testers

After deployment:

1. Copy the Vercel URL.
2. Send it to testers in WeChat or another chat app.
3. Ask them to open it on their phone.
4. Android users can tap the install prompt when it appears.
5. iPhone users can use Safari -> Share -> Add to Home Screen.

## 5. Suggested test path

Ask testers to finish this path:

1. Register and complete profile.
2. Publish one activity.
3. Join another person's activity.
4. Post in activity discussion.
5. Try report/block.
6. After the activity ends, leave a review.

## 6. What feedback to collect

- Could they understand the product in under 30 seconds?
- Was publishing an activity easy?
- Did they trust the safety features?
- Was activity-only discussion enough?
- Would they actually use it again?
