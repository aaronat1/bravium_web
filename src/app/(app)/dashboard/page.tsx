
"use client";

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
import { useI18n } from "@/hooks/use-i18n";

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

export default function DashboardPage() {
  const { t } = useI18n();

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'activo':
        return <Badge variant="secondary">{t.dashboard.status_active}</Badge>;
      case 'expirado':
        return <Badge variant="destructive">{t.dashboard.status_expired}</Badge>;
      case 'advertencia':
        return <Badge variant="default">{t.dashboard.status_warning}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.card_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{t.dashboard.table_caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">{t.dashboard.col_id}</TableHead>
                <TableHead>{t.dashboard.col_name}</TableHead>
                <TableHead>{t.dashboard.col_recipient}</TableHead>
                <TableHead>{t.dashboard.col_issue_date}</TableHead>
                <TableHead>{t.dashboard.col_expiry_date}</TableHead>
                <TableHead className="text-right">{t.dashboard.col_status}</TableHead>
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
