-- Contas persistidas para coordenação (desk_slot 0) e guichês 1–4; senhas com hash no servidor.

CREATE TABLE "staff_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "desk_slot" INTEGER NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_accounts_desk_slot_key" ON "staff_accounts"("desk_slot");
