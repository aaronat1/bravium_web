import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const certificates = [
  {
    id: "CERT-001",
    name: "Desarrollador Frontend Certificado",
    recipient: "Alice Johnson",
    issueDate: "2023-01-15",
    expiryDate: "2025-01-15",
    status: "Activo",
  },
  {
    id: "CERT-002",
    name: "Maestro en Desarrollo Backend",
    recipient: "Bob Williams",
    issueDate: "2022-11-20",
    expiryDate: "2024-11-20",
    status: "Activo",
  },
  {
    id: "CERT-003",
    name: "Profesional en Arquitectura Cloud",
    recipient: "Charlie Brown",
    issueDate: "2021-05-10",
    expiryDate: "2023-05-10",
    status: "Expirado",
  },
  {
    id: "CERT-004",
    name: "Especialista en Diseño UI/UX",
    recipient: "Diana Prince",
    issueDate: "2023-08-01",
    expiryDate: "2025-08-01",
    status: "Activo",
  },
  {
    id: "CERT-005",
    name: "Fundamentos de Ciencia de Datos",
    recipient: "Ethan Hunt",
    issueDate: "2023-03-22",
    expiryDate: "2024-03-22",
    status: "Advertencia",
  },
  {
    id: "CERT-006",
    name: "Gestión de Proyectos Agile",
    recipient: "Fiona Glenanne",
    issueDate: "2022-07-30",
    expiryDate: "2024-07-30",
    status: "Activo",
  },
];

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'activo':
      return <Badge variant="secondary">Activo</Badge>;
    case 'expirado':
      return <Badge variant="destructive">Expirado</Badge>;
    case 'advertencia':
      return <Badge variant="default">Expira Pronto</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Panel</h1>
      <Card>
        <CardHeader>
          <CardTitle>Certificados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Una lista de certificados recientes.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">ID de Certificado</TableHead>
                <TableHead>Nombre del Certificado</TableHead>
                <TableHead>Receptor</TableHead>
                <TableHead>Fecha de Emisión</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((cert) => (
                <TableRow key={cert.id} className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <TableCell className="font-medium">{cert.id}</TableCell>
                  <TableCell>{cert.name}</TableCell>
                  <TableCell>{cert.recipient}</TableCell>
                  <TableCell>{cert.issueDate}</TableCell>
                  <TableCell>{cert.expiryDate}</TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(cert.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
