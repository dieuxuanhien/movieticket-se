export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
  },
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  payment: {
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  },
  booking: {
    seatLockDurationMinutes: parseInt(
      process.env.SEAT_LOCK_DURATION_MINUTES || '10',
      10,
    ),
  },
});
