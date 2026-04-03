/*
  Warnings:

  - You are about to drop the `interactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_author_id_fkey";

-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_question_id_fkey";

-- DropTable
DROP TABLE "interactions";

-- CreateTable
CREATE TABLE "question_interactions" (
    "id" TEXT NOT NULL,
    "action" "Action" NOT NULL,
    "author_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_interactions" (
    "id" TEXT NOT NULL,
    "action" "Action" NOT NULL,
    "author_id" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_interactions_question_id_idx" ON "question_interactions"("question_id");

-- CreateIndex
CREATE INDEX "answer_interactions_answer_id_idx" ON "answer_interactions"("answer_id");

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
