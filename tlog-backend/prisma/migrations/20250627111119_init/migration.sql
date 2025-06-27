-- CreateEnum
CREATE TYPE "Role" AS ENUM ('survivor', 'nikita', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'survivor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_round_stats" (
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_round_stats_pkey" PRIMARY KEY ("round_id","user_id")
);

-- CreateTable
CREATE TABLE "tap_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tap_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_batches" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "click_count" INTEGER NOT NULL,
    "batch_timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "tap_events_round_id_user_id_created_at_key" ON "tap_events"("round_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "click_batches_round_id_user_id_idx" ON "click_batches"("round_id", "user_id");

-- CreateIndex
CREATE INDEX "click_batches_round_id_batch_timestamp_idx" ON "click_batches"("round_id", "batch_timestamp");

-- AddForeignKey
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_events" ADD CONSTRAINT "tap_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_events" ADD CONSTRAINT "tap_events_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_batches" ADD CONSTRAINT "click_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_batches" ADD CONSTRAINT "click_batches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
