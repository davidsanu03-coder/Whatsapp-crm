# ROYEXA Admin Control Center

This directory is the separate Vercel admin deployment entry point.

## Deployment

Create a second Vercel project from this repository and set its Root Directory to `admin-app`.

The admin app must use the same Supabase project and enforce `security_admin` + AAL2 server-side. Never put service-role keys in browser environment variables.

Recommended Vercel URL: `royexa-admin.vercel.app` (Vercel assigns the final available project URL).
