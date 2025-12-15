import { spawn } from "node:child_process";

// Firebase Studio a veces añade --turbopack. Lo eliminamos.
const args = process.argv.slice(2).filter(a => a !== "--turbopack");

// Arrancamos el servidor de desarrollo de Next.js pasando los argumentos filtrados.
const child = spawn("node", ["./node_modules/next/dist/bin/next", "dev", ...args], {
  stdio: "inherit", // Redirige la salida (logs, errores) a la terminal actual.
  env: process.env, // Pasa las variables de entorno actuales al proceso hijo.
});

// Aseguramos que si el proceso hijo termina, el script wrapper también lo haga.
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
    console.error("Failed to start Next.js dev server:", err);
    process.exit(1);
});