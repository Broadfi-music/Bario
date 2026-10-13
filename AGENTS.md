# Bario (PropTech rentals)
- Roles live in public.user_roles (admin/agent/tenant) assigned by the signup trigger; never trust client-sent roles beyond tenant/agent. Why: prevents privilege escalation.
- Landlord contact details live only in public.property_contacts (agent-owner/admin RLS); tenants read listings via the property_catalog view. Why: anti-bypass.
- Payments are created and verified only in the escrow-pay edge function (Paystack, service role); clients never insert payments. Why: amounts can't be tampered with.
- Listing media is stored in the user-uploads bucket under {userId}/listings/. Why: project blocks new public buckets.
- Agent withdrawals and multi-home inspection bookings go through security-definer RPCs (request_withdrawal, book_inspections) that compute balances/fees server-side. Why: clients can't fake balances or skip fees.
- Installability uses a static manifest without an app-shell service worker; keep legacy manifest id/start_url stable and ship the same-path retirement worker. Why: avoids stale installed app shells while preserving installation identity.
- Welcome is a three-step frontend flow at /welcome, shown on first phone or standalone launch, with returning users routed to auth or their existing dashboard. Why: keeps onboarding separate from authentication and retains the desktop landing page.
