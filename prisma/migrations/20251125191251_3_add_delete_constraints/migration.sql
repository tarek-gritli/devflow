-- DropForeignKey
ALTER TABLE "answer_interactions" DROP CONSTRAINT "answer_interactions_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "answer_interactions" DROP CONSTRAINT "answer_interactions_author_id_fkey";

-- DropForeignKey
ALTER TABLE "answer_votes" DROP CONSTRAINT "answer_votes_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "answer_votes" DROP CONSTRAINT "answer_votes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "collections" DROP CONSTRAINT "collections_author_id_fkey";

-- DropForeignKey
ALTER TABLE "collections" DROP CONSTRAINT "collections_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_interactions" DROP CONSTRAINT "question_interactions_author_id_fkey";

-- DropForeignKey
ALTER TABLE "question_interactions" DROP CONSTRAINT "question_interactions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_votes" DROP CONSTRAINT "question_votes_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_votes" DROP CONSTRAINT "question_votes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "questions_tags" DROP CONSTRAINT "questions_tags_question_id_fkey";

-- AddForeignKey
ALTER TABLE "questions_tags" ADD CONSTRAINT "questions_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_votes" ADD CONSTRAINT "question_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_votes" ADD CONSTRAINT "question_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_votes" ADD CONSTRAINT "answer_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_votes" ADD CONSTRAINT "answer_votes_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
