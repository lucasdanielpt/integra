"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Ticket, RefreshCw, Users, ArrowLeft, Tv, Loader2 } from "lucide-react";
import {
  formatPhoneDisplay,
  isValidBrMobileDigits,
  normalizePhone,
  describePhoneInputHint,
} from "@/lib/phone";
import { isValidCpf, rejectionMessageForCpfInput } from "@/lib/cpf";
import { cn } from "@/lib/utils";

/** Celular (/): atualiza posição na fila pelo CPF um pouco mais rápido */
const MOBILE_QUEUE_POLL_MS = 8_000;
/** Celular (/): estado geral da fila do dia (GET /api/queue) ao acompanhar senha */
const MOBILE_DAY_POLL_MS = 8_000;
/** Totem: após mostrar senha (nova ou já na fila), volta ao CPF neste intervalo */
const TOTEM_AUTO_RESET_MS = 5000;

export type QueueClientVariant = "mobile" | "totem";

type QueueDaySnapshot = {
  currentTicket: number;
  lastTicket: number;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

type Screen =
  | "enter_cpf"
  | "in_queue"
  | "take_ticket"
  | "issued_new";

type Props = { variant: QueueClientVariant };

export function QueueClientFlow({ variant }: Props) {
  const isTotem = variant === "totem";
  const isMobile = variant === "mobile";
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
  /** Só celular: senha sendo chamada / última do dia na TV */
  const [daySnapshot, setDaySnapshot] = useState<QueueDaySnapshot | null>(null);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const isCooldownActive = cooldownRemaining > 0;
  const cpfDigits = digitsOnly(cpf);
  const phoneDigits = normalizePhone(phone);

  const canCheckCpf = isValidCpf(cpfDigits);
  const cpfAssist = useMemo(() => {
    if (screen !== "enter_cpf") return null;
    if (cpfDigits.length === 0) return null;
    const msg = rejectionMessageForCpfInput(cpfDigits);
    if (!msg) return null;
    return cpfDigits.length === 11
      ? { level: "error" as const, msg }
      : { level: "hint" as const, msg };
  }, [screen, cpfDigits]);

  const phoneHint = useMemo(() => {
    if (screen !== "take_ticket" || !needsRegistration) return null;
    return describePhoneInputHint(phoneDigits);
  }, [screen, needsRegistration, phoneDigits]);

  const canTakeTicket = useMemo(() => {
    if (!canCheckCpf) return false;
    if (needsRegistration) {
      return name.trim().length > 0 && isValidBrMobileDigits(phoneDigits);
    }
    return true;
  }, [canCheckCpf, needsRegistration, name, phoneDigits]);

  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [isCooldownActive]);

  const scheduleTotemReset = useCallback(() => {
    const until = Date.now() + TOTEM_AUTO_RESET_MS;
    setCooldownUntil(until);
    setResetAt(until);
    setNow(Date.now());
  }, []);

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
    setDaySnapshot(null);
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
        setError(
          data.error ??
            "Não foi possível consultar agora. Aguarde um instante e tente de novo."
        );
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
        if (isTotem) scheduleTotemReset();
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
      setError(
        "Sem conexão com a internet ou o sistema está indisponível. Confira sua rede e tente outra vez."
      );
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
        setError(
          data.error ??
            "Não foi possível atualizar sua posição. Toque em Atualizar de novo em instantes."
        );
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
      setError(
        "Conexão instável. Verifique a internet e toque em Atualizar posição."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [cpf]);

  const fetchDaySnapshot = useCallback(async () => {
    try {
      const r = await fetch("/api/queue", { cache: "no-store" });
      const d = (await r.json()) as Partial<QueueDaySnapshot>;
      if (!r.ok || typeof d.currentTicket !== "number") return;
      setDaySnapshot({
        currentTicket: d.currentTicket,
        lastTicket: typeof d.lastTicket === "number" ? d.lastTicket : d.currentTicket,
      });
    } catch {
      /* ignora erro de rede no acompanhamento em segundo plano */
    }
  }, []);

  useEffect(() => {
    if (!isMobile || isTotem) {
      setDaySnapshot(null);
      return;
    }
    if (screen !== "in_queue" && screen !== "issued_new") {
      setDaySnapshot(null);
      return;
    }
    void fetchDaySnapshot();
    const id = window.setInterval(() => {
      void fetchDaySnapshot();
    }, MOBILE_DAY_POLL_MS);
    return () => window.clearInterval(id);
  }, [isMobile, isTotem, screen, fetchDaySnapshot]);

  useEffect(() => {
    if (isTotem) return;
    if (screen !== "in_queue" || ticket === null) return;
    void refreshQueuePosition();
    const id = window.setInterval(() => {
      void refreshQueuePosition();
    }, MOBILE_QUEUE_POLL_MS);
    return () => window.clearInterval(id);
  }, [isTotem, screen, ticket, refreshQueuePosition]);

  function ticketPadOrDash(n: number): string {
    return n > 0 ? String(n).padStart(3, "0") : "—";
  }

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
        setError(
          data.error ??
            "Não conseguimos emitir a senha neste momento. Tente de novo ou fale com a recepção."
        );
        return;
      }
      applyQueueDisplay(data);

      if (data.alreadyInQueue) {
        setScreen("in_queue");
        setAlreadyInQueue(true);
        if (isTotem) scheduleTotemReset();
      } else {
        setScreen("issued_new");
        setAlreadyInQueue(false);
        if (
          needsRegistration &&
          name.trim() &&
          isValidBrMobileDigits(phoneDigits)
        ) {
          setKnownPatientName(name.trim());
          setKnownPatientPhone(formatPhoneDisplay(phoneDigits));
        }
        const until = Date.now() + TOTEM_AUTO_RESET_MS;
        setCooldownUntil(until);
        setResetAt(until);
        setNow(Date.now());
      }
    } catch {
      setError(
        "Sem conexão. Sua senha pode não ter sido registrada — confira com a recepção se o problema continuar."
      );
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

  const showBackToCpf =
    screen !== "enter_cpf" &&
    !(isTotem && (screen === "in_queue" || screen === "issued_new"));

  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-background touch-manipulation",
        isTotem ? "p-6 md:p-10" : "p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div
        className={cn(
          "w-full flex flex-col items-center",
          isTotem ? "max-w-3xl gap-10 md:gap-12" : "max-w-md sm:max-w-lg gap-6 sm:gap-8"
        )}
      >
        <Image
          src="/logo-integra.png"
          alt="Clínica Íntegra - Cardiologia e Medicina Especializada"
          width={isTotem ? 260 : 160}
          height={isTotem ? 260 : 160}
          className="rounded-full"
          priority
        />

        <Card className="w-full border-border shadow-lg">
          <CardContent
            aria-busy={isLoading}
            className={cn(
              "flex flex-col items-center gap-6 w-full",
              isTotem ? "p-8 md:p-12 gap-8" : "p-6 sm:p-8"
            )}
          >
            <div className="text-center space-y-2">
              {isMobile && (
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Pela fila no celular
                </p>
              )}
              <h1
                className={cn(
                  "font-semibold text-foreground",
                  isTotem ? "text-4xl md:text-5xl" : "text-3xl leading-tight"
                )}
              >
                {isTotem ? "Retire sua senha" : "Sua senha na fila"}
              </h1>
              <p
                className={cn(
                  "text-muted-foreground",
                  isTotem ? "text-xl md:text-2xl" : "text-base"
                )}
              >
                {isTotem
                  ? "Toque nos campos e informe apenas o CPF para começar"
                  : "Informe primeiro só o seu CPF. Pelo QR você entra sempre por aqui."}
              </p>
              {isMobile && screen === "enter_cpf" && (
                <p className="text-sm text-muted-foreground">
                  Passo 1 · CPF{" "}
                  <span className="text-muted-foreground/70">→ depois dados, se precisar</span>
                </p>
              )}
              {isMobile && screen === "take_ticket" && (
                <p className="text-sm text-muted-foreground">Passo 2 · Confirmar dados e retirar senha</p>
              )}
            </div>

            {error ? (
              <div
                role="alert"
                className={cn(
                  "w-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive",
                  isTotem ? "text-lg text-center" : "text-sm text-center"
                )}
              >
                <p>{error}</p>
              </div>
            ) : null}

            {isMobile &&
              daySnapshot &&
              ticket !== null &&
              (screen === "in_queue" || screen === "issued_new") && (
                <div className="w-full rounded-xl border border-border bg-muted/40 p-4 text-left">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <Tv className="h-4 w-4 shrink-0" aria-hidden />
                    Fila na TV neste momento
                  </div>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Chamando agora</dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {ticketPadOrDash(daySnapshot.currentTicket)}
                    </dd>
                    <dt className="text-muted-foreground">Última senha do dia</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {ticketPadOrDash(daySnapshot.lastTicket)}
                    </dd>
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Atualiza automaticamente junto com a sua posição na fila.
                  </p>
                </div>
              )}

            {showBackToCpf && (
              <Button
                type="button"
                variant="ghost"
                size={isTotem ? "lg" : "sm"}
                className={cn(
                  "self-start text-muted-foreground",
                  isTotem && "text-xl h-14 px-4",
                  isMobile && "min-h-11 text-base"
                )}
                onClick={() => {
                  if (screen === "issued_new" && isCooldownActive) return;
                  goAnotherCpf();
                }}
              >
                <ArrowLeft className={cn("mr-2", isTotem ? "h-7 w-7" : "h-4 w-4")} />
                {isTotem ? "Começar de novo" : "Outro CPF"}
              </Button>
            )}

            {(screen === "in_queue" || screen === "issued_new") &&
              ticket !== null && (
                <div className="w-full flex flex-col items-center gap-4 text-center">
                  {screen === "in_queue" && (
                    <p
                      className={cn(
                        "font-medium text-amber-700 dark:text-amber-500",
                        isTotem ? "text-2xl md:text-3xl" : "text-sm"
                      )}
                    >
                      Você já está na fila
                    </p>
                  )}
                  {screen === "issued_new" && !alreadyInQueue && (
                    <p
                      className={cn(
                        "text-muted-foreground",
                        isTotem ? "text-2xl md:text-3xl" : ""
                      )}
                    >
                      Sua senha é
                    </p>
                  )}
                  {(screen === "in_queue" || screen === "issued_new") &&
                    knownPatientName && (
                      <div
                        className={cn(
                          "text-foreground space-y-1",
                          isTotem ? "text-xl md:text-2xl" : isMobile ? "text-base" : "text-sm"
                        )}
                      >
                        <p className="font-medium">{knownPatientName}</p>
                        {knownPatientPhone ? (
                          <p className="text-muted-foreground">
                            Celular: {knownPatientPhone}
                          </p>
                        ) : null}
                      </div>
                    )}
                  {positionLine && (
                    <div
                      className={cn(
                        "flex items-center justify-center gap-2 text-muted-foreground text-center",
                        isTotem ? "text-xl md:text-2xl" : "text-sm"
                      )}
                    >
                      <Users
                        className={cn(
                          "shrink-0 inline",
                          isTotem ? "h-8 w-8" : "h-4 w-4"
                        )}
                      />
                      <span>{positionLine}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "font-bold text-primary tracking-tight",
                      isTotem
                        ? "text-[clamp(5rem,18vw,9rem)] leading-none py-4"
                        : isMobile
                          ? "text-8xl leading-none py-2"
                          : "text-7xl"
                    )}
                  >
                    {String(ticket).padStart(3, "0")}
                  </div>
                  {isTotem && isCooldownActive && (
                    <p className="text-xl text-muted-foreground">
                      Voltando ao início em {cooldownRemaining}s…
                    </p>
                  )}
                  {screen === "in_queue" && !isTotem && (
                    <>
                      <p className="text-xs text-muted-foreground max-w-sm text-center sm:text-sm">
                        {isMobile
                          ? "Sua posição na fila é atualizada automaticamente a cada poucos segundos. Você também pode tocar em Atualizar."
                          : "Posição atualizada automaticamente. Use &quot;Atualizar&quot; ou aguarde."}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void refreshQueuePosition()}
                        disabled={isRefreshing}
                        className={cn(
                          "w-full font-medium",
                          isMobile ? "h-14 text-base" : "h-14 text-lg"
                        )}
                      >
                        <RefreshCw
                          className={`mr-2 h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        {isRefreshing ? "Atualizando..." : "Atualizar posição"}
                      </Button>
                    </>
                  )}
                </div>
              )}

            {(screen === "enter_cpf" || screen === "take_ticket") && (
              <div className="w-full flex flex-col gap-4 md:gap-6">
                {isMobile &&
                  screen === "take_ticket" &&
                  !needsRegistration &&
                  knownPatientName && (
                    <p className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-center text-base text-foreground leading-snug">
                      <span className="text-muted-foreground">Encontramos seu cadastro: </span>
                      <span className="font-semibold">{knownPatientName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — confira nome e celular abaixo antes de retirar a senha.
                      </span>
                    </p>
                  )}

                <Field>
                  <FieldLabel
                    htmlFor="cpf"
                    className={isTotem ? "text-xl" : isMobile ? "text-base" : undefined}
                  >
                    CPF
                  </FieldLabel>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    disabled={
                      isLoading || isCooldownActive || screen === "take_ticket"
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={cpfAssist?.level === "error"}
                    aria-describedby={cpfAssist ? "cpf-field-feedback" : undefined}
                    className={cn(
                      isTotem
                        ? "min-h-16 md:min-h-20 text-2xl md:text-3xl px-6"
                        : "min-h-12 text-base px-4",
                      cpfAssist?.level === "error" &&
                        "border-destructive focus-visible:border-destructive"
                    )}
                  />
                  {cpfAssist ? (
                    <p
                      id="cpf-field-feedback"
                      role={cpfAssist.level === "error" ? "alert" : undefined}
                      className={cn(
                        "mt-1.5 text-sm",
                        cpfAssist.level === "error"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {cpfAssist.msg}
                    </p>
                  ) : null}
                </Field>

                {screen === "take_ticket" && needsRegistration && (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor="name"
                        className={isTotem ? "text-xl" : isMobile ? "text-base" : undefined}
                      >
                        Nome completo
                      </FieldLabel>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        className={
                          isTotem
                            ? "min-h-16 md:min-h-20 text-2xl md:text-3xl px-6"
                            : "min-h-12 text-base px-4"
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor="phone"
                        className={isTotem ? "text-xl" : isMobile ? "text-base" : undefined}
                      >
                        Celular (DDD + número)
                      </FieldLabel>
                      <Input
                        id="phone"
                        placeholder="(11) 98765-4321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        inputMode="numeric"
                        aria-describedby={
                          phoneHint ? "phone-field-hint phone-field-help" : "phone-field-help"
                        }
                        className={cn(
                          isTotem
                            ? "min-h-16 md:min-h-20 text-2xl md:text-3xl px-6"
                            : "min-h-12 text-base px-4",
                          phoneHint !== null &&
                            phoneDigits.length === 11 &&
                            phoneDigits[2] !== "9" &&
                            "border-amber-500/70 focus-visible:border-amber-500"
                        )}
                      />
                      {phoneHint ? (
                        <p
                          id="phone-field-hint"
                          className={cn(
                            "mt-1 text-sm",
                            phoneDigits.length === 11 && phoneDigits[2] !== "9"
                              ? "font-medium text-amber-800 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {phoneHint}
                        </p>
                      ) : null}
                      <p
                        id="phone-field-help"
                        className={cn(
                          "text-muted-foreground",
                          phoneHint ? "mt-2" : "mt-1",
                          isTotem ? "text-lg" : isMobile ? "text-sm" : "text-xs"
                        )}
                      >
                        Informe 10 ou 11 dígitos com DDD.
                      </p>
                    </Field>
                  </>
                )}

                {screen === "take_ticket" && !needsRegistration && (
                  <div
                    className={cn(
                      "text-left rounded-lg bg-muted/60 py-4 px-4 space-y-2 w-full",
                      isTotem ? "text-xl md:text-2xl py-6 px-6" : "text-base"
                    )}
                  >
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
                  className={cn(
                    "w-full font-semibold",
                    isTotem
                      ? "h-24 text-3xl md:text-4xl rounded-2xl"
                      : "h-[3.25rem] min-h-[3.25rem] text-lg sm:h-16"
                  )}
                >
                  {isLoading ? (
                    <Loader2
                      className={cn(
                        "mr-2 animate-spin shrink-0",
                        isTotem ? "h-10 w-10" : "h-6 w-6"
                      )}
                      aria-hidden
                    />
                  ) : (
                    <Ticket className={cn("mr-2", isTotem ? "h-10 w-10" : "h-6 w-6 shrink-0")} />
                  )}
                  {isLoading ? "Verificando..." : "Continuar"}
                </Button>
              )}

              {screen === "take_ticket" && (
                <>
                  {needsRegistration && !canTakeTicket && !isLoading ? (
                    <p className="text-center text-sm text-muted-foreground px-1">
                      Preencha nome completo e celular com DDD. Na primeira vez no sistema esse
                      passo é obrigatório.
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void handleTakeTicket()}
                    disabled={isLoading || !canTakeTicket}
                    size="lg"
                    className={cn(
                      "w-full font-semibold",
                      isTotem
                        ? "h-24 text-3xl md:text-4xl rounded-2xl"
                        : "h-[3.25rem] min-h-[3.25rem] text-lg sm:h-16"
                    )}
                  >
                    {isLoading ? (
                      <Loader2
                        className={cn(
                          "mr-2 animate-spin shrink-0",
                          isTotem ? "h-10 w-10" : "h-6 w-6"
                        )}
                        aria-hidden
                      />
                    ) : (
                      <Ticket className={cn("mr-2", isTotem ? "h-10 w-10" : "h-6 w-6 shrink-0")} />
                    )}
                    {isLoading ? "Emitindo..." : "Retirar senha"}
                  </Button>
                </>
              )}

              {!isTotem &&
                isCooldownActive &&
                screen === "issued_new" && (
                <p className="text-center text-sm text-muted-foreground">
                  Aguarde {cooldownRemaining}s para encerrar ou informar outro CPF.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {!isTotem && (
          <nav className="flex w-full max-w-md flex-col gap-3 sm:max-w-lg">
            <Button asChild variant="default" className="h-12 w-full text-base">
              <Link href="/painel">Abrir painel da sala</Link>
            </Button>
            <Link
              href="/admin"
              className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Administração
            </Link>
          </nav>
        )}
      </div>
    </main>
  );
}
