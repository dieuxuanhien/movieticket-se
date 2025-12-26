/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cinema_reviews" DROP CONSTRAINT "cinema_reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "seat_locks" DROP CONSTRAINT "seat_locks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_cinema_id_fkey";

-- DropTable
DROP TABLE "users";
