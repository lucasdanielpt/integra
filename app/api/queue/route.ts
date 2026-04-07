import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getQueueState,
  generateTicket,
  callNextTicket,
  resetQueue,
  getTicketById,
} from "@/lib/queue-store";
import { isValidAdminSession } from "@/lib/admin-session";

const SESSION_TOKEN = "admin_session";

async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_TOKEN)?.value;
  return isValidAdminSession(sessionToken);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getQueueState();
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    const { tickets, currentTicketInfo, ...publicState } = state;
    return NextResponse.json(publicState);
  }
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const { action, name, email, tel } = await request.json();

  switch (action) {
    case "generate":
      const ticket = generateTicket({ name, email, tel });
      const queueState = getQueueState();
      return NextResponse.json({
        ticket,
        currentTicket: queueState.currentTicket,
        lastTicket: queueState.lastTicket,
        calledAt: queueState.calledAt,
      });

    case "call":
      if (!(await isAdminAuthenticated())) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      const called = callNextTicket();
      if (called === null) {
        return NextResponse.json(
          { error: "Não há senhas na fila", ...getQueueState() },
          { status: 400 },
        );
      }
      const ticket_info = getTicketById(called);
      return NextResponse.json({ called, ticket_info, ...getQueueState() });

    case "reset":
      if (!(await isAdminAuthenticated())) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      resetQueue();
      return NextResponse.json({ message: "Fila zerada", ...getQueueState() });

    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}
