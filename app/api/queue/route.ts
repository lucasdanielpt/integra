import { NextResponse } from "next/server";
import {
  getQueueState,
  generateTicket,
  callNextTicket,
  resetQueue,
} from "@/lib/queue-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getQueueState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const { action, name, email, tel } = await request.json();

  switch (action) {
    case "generate":
      const new_ticket = generateTicket({ name, email, tel });
      const queueState = getQueueState();
      return NextResponse.json({ new_ticket, ...queueState });

    case "call":
      const called = callNextTicket();
      if (called === null) {
        return NextResponse.json(
          { error: "Não há senhas na fila", ...getQueueState() },
          { status: 400 },
        );
      }
      return NextResponse.json({ called, ...getQueueState() });

    case "reset":
      resetQueue();
      return NextResponse.json({ message: "Fila zerada", ...getQueueState() });

    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}
