# Student Results Portal v2

Mobile-first Next.js portal for DR. OPARE's academic results workflow.

## Scoring
- Microsoft Forms written exam: 70 marks after weighting
- Viva: 3 questions × 10 = 30 marks
- Final assessment: /100
- Additional marks: Dressing /1 + Delivery /2 + Composure /2 = /5
- Overall: /105
- Overall percentage: overall / 105 × 100

## Routes
- `/` student result lookup (published + complete results only)
- `/admin` administrator dashboard

## Required server environment variables
- `DATABASE_URL` — Neon PostgreSQL pooled connection string
- `ADMIN_PASSWORD` — long unique administrator password

Never prefix either variable with `NEXT_PUBLIC_`.
