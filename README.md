# Ochir Couture

Ochir Couture is a Mongolian-language Next.js storefront with a Supabase catalog and order database, an admin area, and a lazily loaded Three.js viewer for the supplied FBX. The original page is preserved as `reference/ochir-couture-source.html`; the original model is served from `public/models/` without modification.

## Local development

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set the values in `.env.local` before using the live catalog, admin, or order submission. Until Supabase is connected, the storefront shows a setup message instead of sample products. Order submission also stays disabled until the Upstash rate limiter is configured.

## Supabase setup

1. Create a Supabase project.
2. Copy the SQL in `supabase/migrations/202611140001_initial_schema.sql` into the Supabase SQL Editor and run it. It creates the product and order schema, indexes, RLS policies, the private admin table, and the six existing catalog products.
3. Add the project URL and **publishable** key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Add the server-only `SUPABASE_SECRET_KEY` in `.env.local`. This key is used only by the order route and must never be prefixed with `NEXT_PUBLIC_`, committed, or sent to the browser.
5. Create the first admin through Supabase Auth (invite the intended staff email or create the account in the dashboard). Then add that exact Auth user to the private admin table in the SQL Editor:

   ```sql
   insert into private.admin_users (user_id)
   select id from auth.users where email = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```

   Replace the example email in the SQL editor with the staff account you created. Admin access is checked from this server-controlled table and RLS policy; browser user metadata is not used for authorization. Do not allow public account registration unless you intend to operate an open registration system.

## Order abuse protection

The public order route uses Upstash Redis with a shared sliding-window limit of five submissions per 15 minutes per Vercel client IP. This works across serverless instances; it does not rely on an in-memory counter. Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The route fails closed when the limiter is unavailable. It also uses a honeypot and a unique submission UUID to reject simple bots and prevent accidental duplicate inserts.

## Vercel environment variables

In the Vercel project settings, add the following values separately for **Development**, **Preview**, and **Production**:

| Variable | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe key; database access is still constrained by RLS |
| `SUPABASE_SECRET_KEY` | Server only; never expose in browser code |
| `UPSTASH_REDIS_REST_URL` | Server-only shared rate-limit database URL |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Upstash token |

For local development, use the same names in `.env.local`. Keep `.env.local` out of Git. Configure the initial admin in each Supabase project used for a deployment; Preview deployments can point at a separate Supabase project if you want isolated order data.

## Model and product media

The viewer uses the supplied textured model at `public/models/workwear-textured/Meshy_AI_Winter_Workwear_Figure_20261112_image-to-3d-texture.fbx`; the original untextured FBX is preserved in `reference/models/`. Embedded color and normal maps preserve fabric detail, and the base-color, accent-color, and reflective-tape controls recolor matching texture regions live in the 3D preview. The textured model remains one mesh, so jacket/trouser visibility and logo placement are saved with the order but are not separate 3D edits. Rotation and viewer lighting work on the model. The viewer code and FBX load only when the studio is near view; rendering pauses when hidden or offscreen.

There were no product photographs in the supplied project. No product images or certifications are fabricated. The FBX stays as a static public asset; Supabase Storage is not used.

## Checks

```powershell
npm run typecheck
npm run lint
npm run build
```
