import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COLLECTIONS = [
  "users",
  "transactions",
  "goals",
  "accounts",
  "budgets",
  "categories",
];

// Snapshot of every watched collection lives in one doc, so it must stay under
// Firestore's 1MiB document limit — fine at personal scale, but worth knowing.
const STATE_DOC = db.collection("app_config").doc("telegramNotifierState");

function formatCurrency(amount, currency = "COP") {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}

async function fetchAll(collectionName) {
  const snap = await db.collection(collectionName).get();
  const map = {};
  snap.forEach((doc) => {
    map[doc.id] = doc.data();
  });
  return map;
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram send failed:", data);
  }
}

function usernameFor(usersMap, userId) {
  const u = usersMap[userId];
  return (u && (u.username || u.email)) || "Un usuario";
}

function buildCreatedMessage(entity, username, data) {
  switch (entity) {
    case "transactions": {
      const kind = data.isIncome ? "un ingreso" : "un gasto";
      return `${username} registró ${kind} de ${formatCurrency(data.amount)} en ${data.category || "Sin categoría"}`;
    }
    case "goals":
      return `${username} creó una nueva meta: "${data.title}"`;
    case "accounts":
      return `${username} creó una nueva cuenta: "${data.name}"`;
    case "budgets":
      return `${username} creó un presupuesto de "${data.category}": ${formatCurrency(data.monthlyLimit)}/mes`;
    case "categories":
      return `${username} creó una categoría: "${data.name}"`;
    default:
      return null;
  }
}

function buildModifiedMessage(entity, username, prev, curr) {
  switch (entity) {
    case "users": {
      const parts = [];
      if (curr.username && curr.username !== prev.username) {
        parts.push(`cambió su nombre a "${curr.username}"`);
      }
      if (curr.currency && curr.currency !== prev.currency) {
        parts.push(`cambió su moneda a ${curr.currency}`);
      }
      if (parts.length === 0) return null;
      return `${username} ${parts.join(" y ")}`;
    }
    case "transactions": {
      const kind = curr.isIncome ? "un ingreso" : "un gasto";
      return `${username} editó un movimiento: "${curr.title}" (${formatCurrency(curr.amount)} en ${curr.category || "Sin categoría"})`;
    }
    case "goals": {
      const diff = (curr.savedAmount || 0) - (prev.savedAmount || 0);
      return diff > 0
        ? `${username} aportó ${formatCurrency(diff)} a su meta "${curr.title}"`
        : `${username} actualizó su meta "${curr.title}"`;
    }
    case "accounts":
      return `${username} editó su cuenta "${curr.name}"`;
    case "budgets":
      return `${username} editó su presupuesto de "${curr.category}": ${formatCurrency(curr.monthlyLimit)}/mes`;
    case "categories":
      return `${username} editó una categoría: "${curr.name}"`;
    default:
      return null;
  }
}

function buildDeletedMessage(entity, username, data) {
  switch (entity) {
    case "transactions": {
      const kind = data.isIncome ? "un ingreso" : "un gasto";
      return `${username} eliminó un movimiento: "${data.title}" (${formatCurrency(data.amount)} en ${data.category || "Sin categoría"})`;
    }
    case "goals":
      return `${username} eliminó la meta "${data.title}"`;
    case "accounts":
      return `${username} eliminó la cuenta "${data.name}"`;
    case "budgets":
      return `${username} eliminó el presupuesto de "${data.category}"`;
    case "categories":
      return `${username} eliminó una categoría: "${data.name}"`;
    default:
      return null;
  }
}

function buildMessages(entity, prevMap, currMap, usersMap) {
  const messages = [];
  const prevIds = new Set(Object.keys(prevMap));
  const currIds = new Set(Object.keys(currMap));

  for (const id of currIds) {
    const data = currMap[id];
    const username = usernameFor(usersMap, data.userId);
    if (!prevIds.has(id)) {
      const msg = buildCreatedMessage(entity, username, data);
      if (msg) messages.push(msg);
    } else if (canonical(prevMap[id]) !== canonical(data)) {
      const msg = buildModifiedMessage(entity, username, prevMap[id], data);
      if (msg) messages.push(msg);
    }
  }

  for (const id of prevIds) {
    if (!currIds.has(id)) {
      const data = prevMap[id];
      const username = usernameFor(usersMap, data.userId);
      const msg = buildDeletedMessage(entity, username, data);
      if (msg) messages.push(msg);
    }
  }

  return messages;
}

async function main() {
  const stateSnap = await STATE_DOC.get();
  const prevState = stateSnap.exists ? stateSnap.data() : null;

  const current = {};
  for (const name of COLLECTIONS) {
    current[name] = await fetchAll(name);
  }

  if (!prevState) {
    await STATE_DOC.set(current);
    console.log("Baseline guardado, no se envían notificaciones en la primera corrida.");
    return;
  }

  const usersMap = { ...(prevState.users || {}), ...current.users };

  const allMessages = [];
  for (const name of COLLECTIONS) {
    const prevMap = prevState[name] || {};
    const currMap = current[name];
    allMessages.push(...buildMessages(name, prevMap, currMap, usersMap));
  }

  for (const msg of allMessages) {
    await sendTelegram(msg);
    await new Promise((r) => setTimeout(r, 300));
  }

  await STATE_DOC.set(current);
  console.log(`Listo. ${allMessages.length} notificacion(es) enviada(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
