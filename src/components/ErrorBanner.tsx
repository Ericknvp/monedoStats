export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function permissionErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === "permission-denied") {
    return "Firestore rechazó esta lectura (permission-denied). Verifica que tu cuenta esté autorizada como admin en firestore.rules.";
  }
  return "Ocurrió un error cargando los datos. Revisa la consola para más detalle.";
}
