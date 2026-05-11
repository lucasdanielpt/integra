-- At most one sessão ativa (aguardando ou em atendimento) por paciente por dia.
CREATE UNIQUE INDEX "queue_sessions_one_active_per_patient_per_day_idx"
ON "queue_sessions" ("patient_id", "queue_date")
WHERE "status" IN ('WAITING', 'CALLED');
