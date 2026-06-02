/*
  Order email idempotency flags are stored in the existing public.orders.data JSONB column.

  Expected JSON fields:
  - confirmationEmailSent: boolean
  - deliveryEmailSent: boolean

  No table schema change is required.
*/
