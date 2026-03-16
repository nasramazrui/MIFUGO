import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, SystemSettings } from '../types';
import { formatCurrency } from '../utils';

export const generateInvoicePDF = async (order: Order, systemSettings: SystemSettings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const appName = systemSettings?.app_name || 'Kuku App';
  const primaryColor = '#d97706'; // amber-600

  // Header
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(appName.toUpperCase(), 20, 25);
  
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RISITI YA KIELEKTRONIKI', 150, 25);

  // Order Info
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TAARIFA ZA ODA', 20, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Namba ya Oda: #${order.id.substring(0, 8).toUpperCase()}`, 20, 65);
  doc.text(`Tarehe: ${new Date(order.createdAt).toLocaleDateString('sw-TZ')}`, 20, 72);
  doc.text(`Hali ya Malipo: ${order.paymentApproved ? 'IMELIPWA' : 'HAIJALIPWA'}`, 20, 79);

  // Customer Info
  doc.setFont('helvetica', 'bold');
  doc.text('MTEJA:', 120, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(order.userName, 120, 65);
  doc.text(order.userContact, 120, 72);

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(20, 95, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BIDHAA', 25, 101.5);
  doc.text('BEI', 100, 101.5);
  doc.text('IDADI', 130, 101.5);
  doc.text('JUMLA', 160, 101.5);

  // Table Content
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  let y = 115;
  order.items.forEach((item) => {
    doc.text(item.name, 25, y);
    doc.text(formatCurrency(item.price, systemSettings?.currency || 'TZS'), 100, y);
    doc.text(item.qty.toString(), 130, y);
    doc.text(formatCurrency(item.price * item.qty, systemSettings?.currency || 'TZS'), 160, y);
    y += 10;
  });

  // Totals
  y += 10;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, y, 190, y);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Gharama ya Usafiri:', 120, y);
  doc.text(formatCurrency(order.deliveryFee, systemSettings?.currency || 'TZS'), 160, y);
  
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('JUMLA KUU:', 120, y);
  doc.setTextColor(primaryColor);
  doc.text(formatCurrency(order.total, systemSettings?.currency || 'TZS'), 160, y);

  // Footer
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Asante kwa kufanya biashara na ${appName}!`, 105, 280, { align: 'center' });

  return doc;
};
