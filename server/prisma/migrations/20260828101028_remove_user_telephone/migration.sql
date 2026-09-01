/*
  Warnings:

  - You are about to drop the column `telephone` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_telephone_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "telephone";
