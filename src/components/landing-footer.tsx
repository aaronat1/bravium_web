import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">Bravium</span>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link href="/#vision" className="text-sm text-muted-foreground hover:text-primary">Visión</Link>
            <Link href="/#planes" className="text-sm text-muted-foreground hover:text-primary">Planes</Link>
            <Link href="/verify" className="text-sm text-muted-foreground hover:text-primary">Verificar</Link>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-primary">Ayuda</Link>
            <Link href="/#contact" className="text-sm text-muted-foreground hover:text-primary">Contacto</Link>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">© {new Date().getFullYear()} Bravium. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
