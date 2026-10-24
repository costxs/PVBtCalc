import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface UserReportItem {
  userId: string;
  name: string;
  email: string;
  visitsCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface RawVisitItem {
  id: number;
  userId: string;
  name: string;
  email: string;
  visitedAt: string;
}

export interface ReportMeta {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  totalUsers: number;
  totalVisits: number;
  adminEmail?: string;
}

export function exportUsersToExcel(
  users: UserReportItem[],
  visits: RawVisitItem[],
  meta: ReportMeta
) {
  const wb = XLSX.utils.book_new();

  // 1. Aba Resumo de Usuários
  const usersHeader = [
    ["PVBtCalc - Relatório de Usuários e Acessos"],
    [`Período: ${meta.periodLabel}`],
    [`Data de Emissão: ${new Date().toLocaleString("pt-BR")}`],
    [`Total de Usuários no Período: ${meta.totalUsers} | Total de Visitas: ${meta.totalVisits}`],
    [], // linha em branco
    ["#", "Nome", "E-mail", "Visitas no Período", "Primeiro Acesso", "Último Acesso", "ID Usuário"],
  ];

  const usersData = users.map((u, index) => [
    index + 1,
    u.name,
    u.email,
    u.visitsCount,
    u.firstSeen ? new Date(u.firstSeen).toLocaleString("pt-BR") : "-",
    u.lastSeen ? new Date(u.lastSeen).toLocaleString("pt-BR") : "-",
    u.userId,
  ]);

  const wsUsers = XLSX.utils.aoa_to_sheet([...usersHeader, ...usersData]);
  wsUsers["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 35 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsUsers, "Usuários");

  // 2. Aba Histórico Detalhado de Visitas
  const visitsHeader = [
    ["PVBtCalc - Log Detalhado de Acessos"],
    [`Período: ${meta.periodLabel}`],
    [],
    ["ID Registro", "Nome", "E-mail", "Data e Hora do Acesso", "ID Usuário"],
  ];

  const visitsData = visits.map((v) => [
    v.id,
    v.name,
    v.email,
    new Date(v.visitedAt).toLocaleString("pt-BR"),
    v.userId,
  ]);

  const wsVisits = XLSX.utils.aoa_to_sheet([...visitsHeader, ...visitsData]);
  wsVisits["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 35 },
    { wch: 24 },
    { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVisits, "Log de Acessos");

  // Salvar arquivo
  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Relatorio_Usuarios_PVBtCalc_${dateStr}.xlsx`);
}

export function exportUsersToPdf(
  users: UserReportItem[],
  meta: ReportMeta
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Cores do tema PVBtCalc
  const primaryColor: [number, number, number] = [30, 58, 95]; // #1e3a5f
  const accentColor: [number, number, number] = [37, 99, 235]; // #2563eb
  const textColor: [number, number, number] = [31, 41, 55]; // #1f2937
  const mutedColor: [number, number, number] = [100, 116, 139]; // #64748b

  // Cabeçalho
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PVBtCalc", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(191, 219, 254);
  doc.text("Painel Administrativo • Relatório de Usuários e Acessos", 46, 14);

  // Metadados do Relatório
  let y = 32;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Resumo de Usuários e Visitas", 14, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(`Período Selecionado: ${meta.periodLabel}`, 14, y);
  doc.text(`Emissão: ${new Date().toLocaleString("pt-BR")}`, 140, y);

  if (meta.adminEmail) {
    y += 5;
    doc.text(`Solicitado por: ${meta.adminEmail}`, 14, y);
  }

  // Cards de Totais
  y += 8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 58, 16, 2, 2, "F");
  doc.roundedRect(76, y, 58, 16, 2, 2, "F");
  doc.roundedRect(138, y, 58, 16, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("USUÁRIOS ÚNICOS", 18, y + 5);
  doc.text("TOTAL DE VISITAS", 80, y + 5);
  doc.text("MÉDIA VISITAS/USUÁRIO", 142, y + 5);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text(String(meta.totalUsers), 18, y + 12);
  doc.text(String(meta.totalVisits), 80, y + 12);
  const avg = meta.totalUsers > 0 ? (meta.totalVisits / meta.totalUsers).toFixed(1) : "0";
  doc.text(avg, 142, y + 12);

  // Tabela
  const tableData = users.map((u, i) => [
    i + 1,
    u.name,
    u.email,
    u.visitsCount,
    u.firstSeen ? new Date(u.firstSeen).toLocaleDateString("pt-BR") : "-",
    u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("pt-BR") : "-",
  ]);

  autoTable(doc, {
    startY: y + 22,
    head: [["#", "Nome", "E-mail", "Visitas", "Primeiro Acesso", "Último Acesso"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: textColor,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 46 },
      2: { cellWidth: 56 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 27, halign: "center" },
      5: { cellWidth: 27, halign: "center" },
    },
    didDrawPage: (data) => {
      // Rodapé com número da página
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `PVBtCalc • Página ${data.pageNumber} de ${pageCount}`,
        14,
        290
      );
    },
  });

  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`Relatorio_Usuarios_PVBtCalc_${dateStr}.pdf`);
}
