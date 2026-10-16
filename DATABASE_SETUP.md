# HerdLedger database setup

The app is connected to Supabase and uses its email/password authentication.
Apply every file in `supabase/migrations` before testing the authenticated
product flows. The second migration corrects the Supabase `pgcrypto` schema
lookup and applies role-specific write permissions.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then add `http://localhost:5173` (or your chosen Vite port) and the deployed
site to **Authentication → URL Configuration → Redirect URLs**. Email
confirmation can be changed under **Authentication → Providers → Email**.

The migrations create user profiles, animal identities, transfer requests,
theft reports and recovery notifications, an opt-in livestock marketplace,
an append-only SHA-256 ledger, rapid-resale fraud alerts, and Row Level
Security policies.

The fourth migration adds an admin-only aggregate analytics function. Admins
can view platform adoption, role distribution, livestock composition,
marketplace supply, transfers, theft recovery, fraud alerts, and seven-day
activity without receiving individual user records. It also prevents signed-in
users from changing their own account role through a direct API request.

The fifth migration adds bulk purchase requests and grouped owner offers. A
buyer can accept offers from multiple owners and confirm each handover once,
while HerdLedger still creates a separate ownership transfer and ledger event
for every animal in the order.

To promote the first administrator, use the Supabase SQL editor with the
account's exact email address:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'admin@example.com';
```

Do not expose role promotion as a public signup option. Sign out and back in
after promotion so the application reloads the updated profile.

## Marketplace and payment model

HerdLedger currently records identity and ownership; it does not collect
payments, hold funds, charge subscriptions, or deduct a commission. Owners can
opt an active animal into the marketplace with an asking price and WhatsApp
number. Buyers can search by livestock details or location, reveal the seller's
contact, inspect the animal, agree payment directly, and then accept the
HerdLedger transfer after payment and physical handover.

This off-platform payment model is intentional for the prototype. Do not claim
that a payment is protected by HerdLedger. A later production release could add
a regulated payment provider and a clearly disclosed fixed completion fee, but
that requires transaction, refund, dispute, and compliance workflows that are
not part of the current schema.

## QR tags

The generated QR code contains a URL such as
`/verify?tag=LVT-NG-XXXXXXXX`. Scanning it opens the public verification page,
which retrieves the current animal record from Supabase. The QR image itself
does not contain the owner's phone number, password, payment information, or
the ledger. Owners should print the QR and attach it to a durable physical tag;
buyers and officials scan it to compare the physical animal with its identity,
current status, and theft warning before a sale or transfer.

Never expose a Supabase service-role key in the frontend or commit it to Git.
This research prototype should not collect national ID numbers or similarly
sensitive personal information.
