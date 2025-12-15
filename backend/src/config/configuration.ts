export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
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
