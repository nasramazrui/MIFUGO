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

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'mayai' | 'nyama' | 'vifaranga' | 'chakula';
  emoji: string;
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
  emoji: string;
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

export interface Withdrawal {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
}

export interface Activity {
  id: string;
  icon: string;
  text: string;
  time: string;
  createdAt: string;
}
