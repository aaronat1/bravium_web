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
    name: "Certified Frontend Developer",
    recipient: "Alice Johnson",
    issueDate: "2023-01-15",
    expiryDate: "2025-01-15",
    status: "Active",
  },
  {
    id: "CERT-002",
    name: "Backend Development Master",
    recipient: "Bob Williams",
    issueDate: "2022-11-20",
    expiryDate: "2024-11-20",
    status: "Active",
  },
  {
    id: "CERT-003",
    name: "Cloud Architecture Pro",
    recipient: "Charlie Brown",
    issueDate: "2021-05-10",
    expiryDate: "2023-05-10",
    status: "Expired",
  },
  {
    id: "CERT-004",
    name: "UI/UX Design Specialist",
    recipient: "Diana Prince",
    issueDate: "2023-08-01",
    expiryDate: "2025-08-01",
    status: "Active",
  },
  {
    id: "CERT-005",
    name: "Data Science Fundamentals",
    recipient: "Ethan Hunt",
    issueDate: "2023-03-22",
    expiryDate: "2024-03-22",
    status: "Warning",
  },
  {
    id: "CERT-006",
    name: "Agile Project Management",
    recipient: "Fiona Glenanne",
    issueDate: "2022-07-30",
    expiryDate: "2024-07-30",
    status: "Active",
  },
];

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="secondary">Active</Badge>;
    case 'expired':
      return <Badge variant="destructive">Expired</Badge>;
    case 'warning':
      return <Badge variant="default">Expires Soon</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of recent certificates.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Certificate ID</TableHead>
                <TableHead>Certificate Name</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
