"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Ticket, RefreshCw, Users, ArrowLeft } from "lucide-react";
import {
  formatPhoneDisplay,
  isValidBrMobileDigits,
  normalizePhone,
} from "@/lib/phone";

const COOLDOWN_SECONDS = 5;
const POLL_MS = 12_000;

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

type Screen =
  | "enter_cpf"
  | "in_queue"
  | "take_ticket"
  | "issued_new";

export default function ClientePage() {
  const [screen, setScreen] = useState<Screen>("enter_cpf");
  const [ticket, setTicket] = useState<number | null>(null);
  const [alreadyInQueue, setAlreadyInQueue] = useState(false);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [knownPatientName, setKnownPatientName] = useState<string | null>(null);
  const [knownPatientPhone, setKnownPatientPhone] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [resetAt, setResetAt] = useState<number | null>(null);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const isCooldownActive = cooldownRemaining > 0;
  const cpfDigits = digitsOnly(cpf);
  const phoneDigits = normalizePhone(phone);

  const canCheckCpf = cpfDigits.length === 11;
  const canTakeTicket = useMemo(() => {
    if (!canCheckCpf) return false;
    if (needsRegistration) {
      return (
        name.trim().length > 0 && isValidBrMobileDigits(phoneDigits)
      );
    }
    return true;
  }, [canCheckCpf, needsRegistration, name, phoneDigits]);

  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [isCooldownActive]);

  const goAnotherCpf = useCallback(() => {
    setScreen("enter_cpf");
    setTicket(null);
    setAlreadyInQueue(false);
    setPeopleAhead(null);
    setNeedsRegistration(false);
    setKnownPatientName(null);
    setKnownPatientPhone(null);
    setError(null);
    setName("");
    setPhone("");
    setCpf("");
    setCooldownUntil(null);
    setResetAt(null);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (resetAt === null) return;
    const delayMs = Math.max(0, resetAt - Date.now());
    const timeout = window.setTimeout(() => {
      goAnotherCpf();
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [resetAt, goAnotherCpf]);

  const applyQueueDisplay = useCallback(
    (data: {
      ticket?: number;
      alreadyInQueue?: boolean;
      peopleAhead?: number;
    }) => {
      if (typeof data.ticket === "number") setTicket(data.ticket);
      setAlreadyInQueue(Boolean(data.alreadyInQueue));
      setPeopleAhead(
        typeof data.peopleAhead === "number" ? data.peopleAhead : null
      );
    },
    []
  );

  const handleCheckCpf = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", cpf }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível consultar o CPF.");
        return;
      }

      if (data.phase === "in_queue") {
        setScreen("in_queue");
        setTicket(data.ticket);
        setPeopleAhead(data.peopleAhead);
        setAlreadyInQueue(true);
        setKnownPatientName(data.patientName ?? null);
        setKnownPatientPhone(
          typeof data.patientPhone === "string" ? data.patientPhone : null
        );
      } else if (data.phase === "can_take_ticket") {
        setScreen("take_ticket");
        setNeedsRegistration(Boolean(data.needsRegistration));
        setKnownPatientName(data.patientName ?? null);
        setKnownPatientPhone(
          typeof data.patientPhone === "string" ? data.patientPhone : null
        );
        setName("");
        setPhone("");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQueuePosition = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", cpf }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Erro ao atualizar.");
        return;
      }
      if (data.phase === "in_queue") {
        setTicket(data.ticket);
        setPeopleAhead(data.peopleAhead);
        setAlreadyInQueue(true);
        setKnownPatientName(data.patientName ?? null);
        setKnownPatientPhone(
          typeof data.patientPhone === "string" ? data.patientPhone : null
        );
      } else {
        setScreen("take_ticket");
        setNeedsRegistration(Boolean(data.needsRegistration));
        setKnownPatientName(data.patientName ?? null);
        setKnownPatientPhone(
          typeof data.patientPhone === "string" ? data.patientPhone : null
        );
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setIsRefreshing(false);
    }
  }, [cpf]);

  useEffect(() => {
    if (screen !== "in_queue" || ticket === null) return;
    const id = window.setInterval(() => {
      void refreshQueuePosition();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [screen, ticket, refreshQueuePosition]);

  const handleTakeTicket = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          name,
          cpf,
          phone: needsRegistration ? phone : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Erro ao retirar senha.");
        return;
      }
      applyQueueDisplay(data);
      if (data.alreadyInQueue) {
        setScreen("in_queue");
        setAlreadyInQueue(true);
      } else {
        setScreen("issued_new");
        setAlreadyInQueue(false);
        if (needsRegistration && name.trim() && isValidBrMobileDigits(phoneDigits)) {
          setKnownPatientName(name.trim());
          setKnownPatientPhone(formatPhoneDisplay(phoneDigits));
        }
        const baseNow = Date.now();
        const until = baseNow + COOLDOWN_SECONDS * 1000;
        setCooldownUntil(until);
        setResetAt(until);
        setNow(Date.now());
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  function positionMessage(): string | null {
    if (ticket === null || peopleAhead === null) return null;
    if (screen === "in_queue" && alreadyInQueue && peopleAhead === 0) {
      return "É a sua vez. Aguarde ser chamado no painel.";
    }
    if (screen === "issued_new" && !alreadyInQueue) {
      if (peopleAhead === 0) return "Você é o próximo da fila.";
      if (peopleAhead === 1) return "1 pessoa à sua frente";
      return `${peopleAhead} pessoas à sua frente`;
    }
    if (screen === "in_queue" || (screen === "issued_new" && alreadyInQueue)) {
      if (peopleAhead === 0) {
        return "É a sua vez. Aguarde ser chamado no painel.";
      }
      if (peopleAhead === 1) return "1 pessoa à sua frente";
      return `${peopleAhead} pessoas à sua frente`;
    }
    return null;
  }

  const positionLine = positionMessage();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <Image
          src="/logo-integra.png"
          alt="Clínica Íntegra - Cardiologia e Medicina Especializada"
          width={180}
          height={180}
          className="rounded-full"
          priority
        />

        <Card className="w-full border-border">
          <CardContent className="p-8 flex flex-col items-center gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Bem-vindo
              </h1>
              <p className="text-muted-foreground">
                Digite apenas seu CPF para continuar
              </p>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            {screen !== "enter_cpf" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start -mt-2 text-muted-foreground"
                onClick={() => {
                  if (screen === "issued_new" && isCooldownActive) return;
                  goAnotherCpf();
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Outro CPF
              </Button>
            )}

            {(screen === "in_queue" || screen === "issued_new") &&
              ticket !== null && (
                <div className="w-full flex flex-col items-center gap-3 text-center">
                  {screen === "in_queue" && (
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                      Você já está na fila
                    </p>
                  )}
                  {screen === "issued_new" && !alreadyInQueue && (
                    <p className="text-muted-foreground">Sua senha é</p>
                  )}
                  {(screen === "in_queue" || screen === "issued_new") &&
                    knownPatientName && (
                      <div className="text-sm text-foreground space-y-1">
                        <p className="font-medium">{knownPatientName}</p>
                        {knownPatientPhone ? (
                          <p className="text-muted-foreground">
                            Celular: {knownPatientPhone}
                          </p>
                        ) : null}
                      </div>
                    )}
                  {positionLine && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm text-center">
                      <Users className="h-4 w-4 shrink-0 inline" />
                      <span>{positionLine}</span>
                    </div>
                  )}
                  <div className="text-7xl font-bold text-primary">
                    {String(ticket).padStart(3, "0")}
                  </div>
                  {screen === "in_queue" && (
                    <>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Posição atualizada automaticamente. Use &quot;Atualizar&quot;
                        ou aguarde.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void refreshQueuePosition()}
                        disabled={isRefreshing}
                        className="w-full"
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        {isRefreshing ? "Atualizando..." : "Atualizar posição"}
                      </Button>
                    </>
                  )}
                </div>
              )}

            {(screen === "enter_cpf" || screen === "take_ticket") && (
              <div className="w-full flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    disabled={
                      isLoading || isCooldownActive || screen === "take_ticket"
                    }
                    inputMode="numeric"
                  />
                </Field>

                {screen === "take_ticket" && needsRegistration && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="name">Nome completo</FieldLabel>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="phone">Celular (DDD + número)</FieldLabel>
                      <Input
                        id="phone"
                        placeholder="(11) 98765-4321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        inputMode="numeric"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Informe 10 ou 11 dígitos com DDD.
                      </p>
                    </Field>
                  </>
                )}

                {screen === "take_ticket" && !needsRegistration && (
                  <div className="text-left text-sm rounded-lg bg-muted/60 py-4 px-4 space-y-2 w-full">
                    <p>
                      <span className="text-muted-foreground">Nome: </span>
                      <span className="font-semibold text-foreground">
                        {knownPatientName ?? "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Celular: </span>
                      <span className="font-semibold text-foreground">
                        {knownPatientPhone ?? "Não informado"}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              {screen === "enter_cpf" && (
                <Button
                  type="button"
                  onClick={() => void handleCheckCpf()}
                  disabled={isLoading || !canCheckCpf}
                  size="lg"
                  className="w-full h-16 text-lg font-semibold"
                >
                  <Ticket className="mr-2 h-6 w-6" />
                  {isLoading ? "Verificando..." : "Continuar"}
                </Button>
              )}

              {screen === "take_ticket" && (
                <Button
                  type="button"
                  onClick={() => void handleTakeTicket()}
                  disabled={isLoading || !canTakeTicket}
                  size="lg"
                  className="w-full h-16 text-lg font-semibold"
                >
                  <Ticket className="mr-2 h-6 w-6" />
                  {isLoading ? "Emitindo..." : "Retirar senha"}
                </Button>
              )}

              {isCooldownActive && screen === "issued_new" && (
                <p className="text-center text-sm text-muted-foreground">
                  Aguarde {cooldownRemaining}s para encerrar ou informar outro CPF.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-primary transition-colors">
            Administração
          </Link>
          <span>|</span>
          <Link href="/painel" className="hover:text-primary transition-colors">
            Painel
          </Link>
        </nav>
      </div>
    </main>
  );
}
