/*
  Warnings:

  - You are about to drop the column `slug` on the `Website` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[secret]` on the table `Website` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `secret` to the `Website` table without a default value. This is not possible if the table is not empty.
  - Made the column `domain` on table `Website` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Website_slug_key";

-- AlterTable
ALTER TABLE "Website" DROP COLUMN "slug",
ADD COLUMN     "secret" TEXT NOT NULL,
ALTER COLUMN "domain" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Website_secret_key" ON "Website"("secret");
