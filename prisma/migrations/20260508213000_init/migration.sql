-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "QueueTicketStatus" AS ENUM ('WAITING', 'CALLED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cpf_normalized" CHAR(11) NOT NULL,
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_number" INTEGER NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "QueueTicketStatus" NOT NULL DEFAULT 'WAITING',
    "called_at" TIMESTAMP(3),
    "queue_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_cpf_normalized_key" ON "patients"("cpf_normalized");

-- CreateIndex
CREATE INDEX "queue_sessions_patient_id_queue_date_idx" ON "queue_sessions"("patient_id", "queue_date");

-- CreateIndex
CREATE INDEX "queue_sessions_queue_date_status_idx" ON "queue_sessions"("queue_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "queue_sessions_queue_date_ticket_number_key" ON "queue_sessions"("queue_date", "ticket_number");

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
