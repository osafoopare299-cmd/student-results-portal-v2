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
- `RESEND_API_KEY` — Resend server API key used for publication notifications
- `RESEND_FROM_EMAIL` — verified sender, for example `Academic Results <results@yourdomain.com>`
- `APP_URL` — public student portal URL included in notification emails

Never expose `DATABASE_URL`, `ADMIN_PASSWORD`, or `RESEND_API_KEY` with a `NEXT_PUBLIC_` prefix.

When an examination changes from unpublished to published, each student with a written result for that examination receives one email. Repeated publish requests do not send duplicates.
