# CMS access roles

| Capability | SUPER_ADMIN | ADMIN | MANAGER | PARTNER | CUSTOMER |
| --- | --- | --- | --- | --- | --- |
| CMS login, dashboard | Yes | Yes | Yes | No | No |
| Content, media, departure cities, leads, bookings | Yes | Yes | Yes | No | No |
| Users and partners | Yes | Yes, lower roles only | No | No | No |
| Site settings, Incoming, audit log | Yes | Yes | No | No | No |
| Create or promote administrators | Yes | No | No | No | No |
| Manage another administrator | Yes | No | No | No | No |
| Permanently delete leads and bookings | Yes | No | No | No | No |
| Agent site login | No | No | No | Yes | No |

`SUPER_ADMIN` is a single system account. It cannot be created, assigned, edited, suspended, deleted, or have its password changed through CMS or API. Its login and password are set only with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in the backend environment. The password must be at least 12 characters. Both values are required for the backend to start.

Administrators cannot edit, block, or delete their own accounts from the user table. They can change their own password only by providing the current password. Promoting an existing account to `ADMIN` requires a new password and revokes its old sessions.

## Deployment

Apply both Prisma migrations before starting the backend. On startup, the backend creates the system account if missing, or synchronizes its email and password hash with the environment. If the configured email belongs to an existing `ADMIN` and there is no super administrator yet, that account is promoted. Changed credentials revoke previous sessions. Changing env values requires a backend restart. If multiple super administrators already exist, resolve that data conflict before applying the unique-index migration. Store the password in server-side secrets, never in the frontend or repository.

The destructive development seed uses the same `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` plus `SEED_MANAGER_PASSWORD` (at least 12 characters). Do not run it against production data.
