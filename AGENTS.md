# Rental platform
- Roles live in public.user_roles (admin/agent/tenant) assigned by the signup trigger; never trust client-sent roles beyond tenant/agent. Why: prevents privilege escalation.
- Landlord contact details live only in public.property_contacts (agent-owner/admin RLS); tenants read listings via the property_catalog view. Why: anti-bypass.
- Payments are created and verified only in the escrow-pay edge function (Paystack, service role); clients never insert payments. Why: amounts can't be tampered with.
- Listing media is stored in the user-uploads bucket under {userId}/listings/. Why: project blocks new public buckets.
- Agent withdrawals and multi-home inspection bookings go through security-definer RPCs (request_withdrawal, book_inspections) that compute balances/fees server-side. Why: clients can't fake balances or skip fees.
- Installability uses a static manifest without an app-shell service worker; keep legacy manifest id/start_url stable and ship the same-path retirement worker. Why: avoids stale installed app shells while preserving installation identity.
- Welcome is a branded green entry at /welcome; mobile authentication uses a four-scene housing carousel above the form. Why: keeps welcome separate from authentication and retains the desktop landing page.
- Admin activity reads listings and profiles under existing admin RLS and shares a profile-details dialog with user management. Why: avoids duplicating private data or weakening contact protections.
- Profile completeness is shared in rentalRules and must also be enforced by the listing insert trigger. Why: the form gate alone cannot enforce access rules.
