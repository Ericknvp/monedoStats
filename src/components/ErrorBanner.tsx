export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-critical/30 bg-critical-soft px-4 py-3 text-sm text-critical">
      {message}
    </div>
  );
}

export function permissionErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === "permission-denied") {
    return "Firestore rechazó esta lectura (permission-denied). Verifica que tu cuenta esté autorizada como admin en firestore.rules.";
  }
  if (code === "failed-precondition") {
    return "Falta un índice en Firestore para esta consulta (failed-precondition). Si acabas de desplegar uno, espera 1-2 minutos y recarga.";
  }
  return `Ocurrió un error cargando los datos${code ? ` (${code})` : ""}. Revisa la consola para más detalle.`;
}
