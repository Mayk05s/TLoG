/*
  Warnings:

  - You are about to drop the `click_batches` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "click_batches" DROP CONSTRAINT "click_batches_round_id_fkey";

-- DropForeignKey
ALTER TABLE "click_batches" DROP CONSTRAINT "click_batches_user_id_fkey";

-- DropTable
DROP TABLE "click_batches";

-- CreateTable
CREATE TABLE "tap_batches" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "click_count" INTEGER NOT NULL,
    "batch_timestamp" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tap_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tap_batches_round_id_user_id_idx" ON "tap_batches"("round_id", "user_id");

-- CreateIndex
CREATE INDEX "tap_batches_round_id_batch_timestamp_idx" ON "tap_batches"("round_id", "batch_timestamp");

-- CreateIndex
CREATE INDEX "tap_batches_round_id_synced_at_idx" ON "tap_batches"("round_id", "synced_at");

-- AddForeignKey
ALTER TABLE "tap_batches" ADD CONSTRAINT "tap_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_batches" ADD CONSTRAINT "tap_batches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
