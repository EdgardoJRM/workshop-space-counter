# Heartbeat estación Chrome (Supabase SQL Editor)

Si `npm run db:push` no está disponible, ejecuta:

```sql
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "printStationLastSeenAt" TIMESTAMP(3);
```

La estación web actualiza este campo en cada poll autenticado a `/api/staff/print-jobs/next`.
