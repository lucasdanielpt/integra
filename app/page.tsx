"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Ticket } from "lucide-react";

const COOLDOWN_SECONDS = 5;

export default function ClientePage() {
  const [ticket, setTicket] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [resetAt, setResetAt] = useState<number | null>(null);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const isCooldownActive = cooldownRemaining > 0;

  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [isCooldownActive]);

  useEffect(() => {
    if (resetAt === null) return;
    const delayMs = Math.max(0, resetAt - Date.now());
    const timeout = window.setTimeout(() => {
      setTicket(null);
      setError(null);
      setName("");
      setCpf("");
      setCooldownUntil(null);
      setResetAt(null);
      setNow(Date.now());
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [resetAt]);

  const canSubmit = name.trim().length > 0 && cpf.trim().length > 0;

  const handleGenerateTicket = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", name, cpf }),
      });

      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        const baseNow = Date.now();
        const until = baseNow + COOLDOWN_SECONDS * 1000;
        setCooldownUntil(until);
        setResetAt(until);
        setNow(Date.now());
      } else {
        setError(data.error || "Erro ao gerar senha");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

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
                Retire sua senha para atendimento
              </p>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            {ticket !== null && (
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Sua senha é</p>
                <div className="text-7xl font-bold text-primary">
                  {String(ticket).padStart(3, "0")}
                </div>
              </div>
            )}

            <div className="w-full flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input
                  id="name"
                  placeholder="Digite seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading || isCooldownActive}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  disabled={isLoading || isCooldownActive}
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="w-full flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleGenerateTicket}
                disabled={isLoading || isCooldownActive || !canSubmit}
                size="lg"
                className="w-full h-16 text-lg font-semibold"
              >
                <Ticket className="mr-2 h-6 w-6" />
                {isLoading
                  ? "Gerando..."
                  : ticket === null
                    ? "Retirar Senha"
                    : "Retirar Nova Senha"}
              </Button>

              {isCooldownActive && (
                <p className="text-center text-sm text-muted-foreground">
                  Aguarde {cooldownRemaining}s para retirar outra senha.
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
