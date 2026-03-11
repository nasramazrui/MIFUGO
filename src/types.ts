export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin';
  avatar?: string;
  contact?: string;
  hasWhatsApp?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  // Vendor specific
  shopName?: string;
  shopIcon?: string;
  shopBanner?: string;
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
  language?: 'sw' | 'en' | 'ar' | 'hi';
  theme?: 'light' | 'dark';
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

export type OrderStatus = 'pending' | 'processing' | 'waiting' | 'onway' | 'pickup' | 'delivered' | 'completed';

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
  payMethod: 'mpesa' | 'tigo' | 'airtel' | 'halopesa' | 'cash' | 'wallet';
  senderName?: string;
  sentAmount?: string;
  transactionId?: string;
  status: OrderStatus;
  paymentProof?: string;
  paymentApproved?: boolean;
  date: string;
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  date: string;
}

export interface ReviewReaction {
  userId: string;
  emoji: string;
}

export interface Review {
  id: string;
  productId?: string;
  vendorId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  date: string;
  likes?: string[]; // Array of user IDs
  reactions?: ReviewReaction[];
  replies?: ReviewReply[];
}

export type WithdrawalStatus = 'Pending' | 'Completed' | 'Rejected' | 'paid' | 'rejected' | 'pending';

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

export interface Category {
  id: string;
  label: string;
  emoji?: string;
  image?: string;
  createdAt?: any;
}

export interface StatusComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Status {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorAvatar?: string;
  text: string;
  videoUrl?: string;
  likes: string[];
  comments: StatusComment[];
  createdAt: any;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'deposit' | 'purchase' | 'refund' | 'bid_hold' | 'bid_refund';
  status: 'pending' | 'approved' | 'rejected';
  method?: string;
  senderName?: string;
  senderPhone?: string;
  transactionId?: string;
  date: string;
  createdAt: any;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  createdAt: any;
}

export interface Auction {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  productName: string;
  description: string;
  startingPrice: number;
  minIncrement: number;
  currentBid: number;
  highestBidderId?: string;
  highestBidderName?: string;
  endTime: any;
  location: string;
  status: 'active' | 'ended';
  image?: string;
  winnerId?: string;
  winnerName?: string;
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: string;
  transactionId?: string;
  senderPhone?: string;
  senderName?: string;
  totalAmount?: number;
  createdAt: any;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  vendorId: string;
}

export interface SystemSettings {
  id: string;
  withdrawalFeeType: 'fixed' | 'percentage';
  withdrawalFeeValue: number;
  adminWhatsApp: string;
  paymentNumber: string;
  paymentName: string;
  updatedAt: any;
}
