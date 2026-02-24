export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin';
  contact?: string;
  hasWhatsApp?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  // Vendor specific
  shopName?: string;
  location?: string;
  region?: string;
  tin?: string;
  nida?: string;
  license?: string;
  openDays?: string[];
  openTime?: string;
  closeTime?: string;
  deliveryCity?: number;
  deliveryOut?: number;
  revenue?: number;
  walletBalance?: number;
  createdAt: string;
}

export type ProductUnit = 'Piece' | 'Kg' | 'Tray' | 'Half' | 'Quarter';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  unit: ProductUnit;
  emoji: string;
  image?: string;
  desc: string;
  location: string;
  region: string;
  vendorId: string;
  vendorName: string;
  approved: boolean;
  deliveryCity: number;
  deliveryOut: number;
  createdAt: string;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  unit?: string;
  emoji: string;
  image?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'waiting' | 'onway' | 'pickup' | 'delivered';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userContact: string;
  userWA?: string;
  payPhone?: string;
  items: OrderItem[];
  productId: string;
  vendorId: string;
  vendorName: string;
  productPrice: number;
  qty: number;
  deliveryFee: number;
  deliveryMethod: 'city' | 'out' | 'pickup';
  total: number;
  payMethod: 'mpesa' | 'bank' | 'cash';
  status: OrderStatus;
  paymentProof?: string;
  paymentApproved?: boolean;
  date: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
}

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface Withdrawal {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  method: 'mobile' | 'bank';
  network?: 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'HaloPesa';
  phoneNumber?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  status: WithdrawalStatus;
  date: string;
  createdAt: any;
}

export interface Activity {
  id: string;
  icon: string;
  text: string;
  time: string;
  createdAt: string;
}
