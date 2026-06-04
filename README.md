# Aabnoor E-Commerce

Aabnoor is a Vite + React e-commerce storefront for beauty, skincare, makeup, hair care, fragrance, and live sale products. The app uses Supabase for authentication and backend data, Vercel serverless functions for secure checkout flows, and Resend for transactional email.

Live site: https://aabnoor.shop

## Features

- Responsive storefront with product categories, product detail pages, cart, checkout, order tracking, profile, and live sale pages.
- Supabase Auth with email/password and Google login support.
- Admin panel with MFA-gated access for dashboard metrics, products, orders, customers, coupons, live sale settings, and store settings.
- Server-side order placement with trusted product pricing, coupon validation, loyalty coin redemption, tracking numbers, and customer coin balance updates.
- Secure coupon preview API so coupon codes are not exposed through frontend data loads.
- User order history through an authenticated `/api/my-orders` endpoint.
- Order tracking with authenticated lookup and Supabase-backed rate limiting.
- Transactional emails through Resend for signup OTP, order confirmation, and delivery notifications.
- PDF invoice and shipping label generation in the admin panel.
- Security headers and CSP configured in `vercel.json`.

## Tech Stack

- React 19
- Vite 6
- TypeScript
- Supabase Auth and Postgres
- Vercel Serverless Functions
- Resend
- Tailwind CSS
- Motion
- Recharts
- jsPDF

## Project Structure

```text
api/                 Vercel serverless API routes
src/                 React application source
src/pages/           Storefront and admin pages
src/components/      Shared UI components
src/lib/             Supabase and store helpers
supabase/migrations/ Database migrations and policy updates
public/              Static assets
vercel.json          Vercel routes and security headers
```

## Local Setup

Prerequisites:

- Node.js 20 or newer
- npm
- A Supabase project
- A verified Resend sending domain for production email

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Use `.env.example` as the reference. Important variables include:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

RESEND_API_KEY=
RESEND_FROM_DOMAIN=aabnoor.shop
ORDER_EMAIL_FROM="Aabnoor <noreply@aabnoor.shop>"
AUTH_EMAIL_FROM="Aabnoor <noreply@aabnoor.shop>"
ORDER_TRACKING_URL="https://aabnoor.shop/track"

SIGNUP_OTP_SECRET=
IP_HASH_SECRET=
REVIEW_HASH_SECRET=
RATE_LIMIT_SECRET=
ADMIN_EMAIL=
ALLOWED_ORIGIN="https://aabnoor.shop,https://www.aabnoor.shop"
```

Before production deployment, verify `aabnoor.shop` in Resend:

```text
https://resend.com/domains
```

## Supabase

Database schema, RLS policies, admin MFA helpers, rate-limit tables, and security updates are stored in:

```text
supabase/migrations/
```

Important backend data tables include:

- `products`
- `orders`
- `customers`
- `coupons`
- `store_settings`
- `admin_users`
- `signup_otps`
- `tracking_rate_limits`
- `coupon_preview_attempts`

Apply migrations to the target Supabase project before deploying code that depends on them.

## Admin Access

Admin access is restricted by:

- Supabase authenticated user
- Membership in `public.admin_users`
- Authenticator app MFA with `aal2`

Admin policies use the database helper:

```sql
public.is_admin_with_mfa()
```

## Common Scripts

```bash
npm run dev       # Start local development server
npm run build     # Build production bundle
npm run preview   # Preview production build
npm run lint      # TypeScript check
```

## Deployment

The app is deployed on Vercel. Production deploys should use the environment variables listed above and the Supabase migrations in this repository.

The production domain is:

```text
https://aabnoor.shop
```

## Security Notes

- Do not commit service role keys, Resend API keys, invite codes, OTP secrets, or admin credentials.
- Frontend code must only use `VITE_` publishable values.
- Coupon validation and order placement are enforced server-side.
- Loyalty coins are stored in Supabase customer data, not browser local storage.
- Tracking and coupon preview endpoints use database-backed rate limiting.
- Security headers are centralized in `vercel.json`.
