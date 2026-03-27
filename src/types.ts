export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin' | 'doctor';
  avatar?: string;
  contact?: string;
  hasWhatsApp?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  points?: number; // Loyalty points
  // Vendor specific
  shopName?: string;
  shopIcon?: string;
  shopBanner?: string;
  location?: string;
  region?: string;
  district?: string;
  village?: string;
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
  loyaltyPoints?: number;
  referralCode?: string;
  referredBy?: string;
  createdAt: string;
  // Doctor specific
  qualification?: string;
  licenseNumber?: string;
  experienceYears?: number;
  specialization?: string;
  consultationFee?: number;
  offersEmergency?: boolean;
  licenseImage?: string;
  isTopDoctor?: boolean;
  topDoctorExpiry?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
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
  description: string;
  location: string;
  region: string;
  vendorId: string;
  vendorName: string;
  approved: boolean;
  deliveryCity: number;
  deliveryOut: number;
  createdAt: string;
  // Livestock specific
  isLivestock?: boolean;
  age?: string;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  breed?: string;
  healthStatus?: 'healthy' | 'sick' | 'recovered';
  birthDate?: string;
  tagNumber?: string;
}

export interface LivestockHealthRecord {
  id: string;
  productId: string;
  type: 'vaccination' | 'treatment' | 'checkup';
  title: string;
  date: string;
  notes?: string;
  performedBy?: string;
  createdAt: any;
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
  doctorId?: string;
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
  liveEnded?: boolean;
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
  // Livestock specific
  tagNumber?: string;
  breed?: string;
  age?: string;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  healthStatus?: 'healthy' | 'sick' | 'recovered';
  birthDate?: string;
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

export interface ForumPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  content: string;
  image?: string;
  likes: string[];
  comments: ForumComment[];
  createdAt: any;
}

export interface ForumComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image?: string;
  read: boolean;
  createdAt: any;
}

export interface VaccinationRecord {
  id: string;
  userId: string;
  livestockId?: string; // Link to specific animal
  birdType?: string; // For poultry
  vaccineName: string;
  date: string;
  nextDueDate: string;
  notes?: string;
  completed: boolean;
  cost?: number;
  createdAt: any;
}

export interface MedicalRecord {
  id: string;
  livestockId: string;
  disease: string;
  medicine: string;
  date: string;
  cost: number;
  notes?: string;
  createdAt: any;
}

export interface BreedingRecord {
  id: string;
  livestockId: string;
  matingDate: string;
  sireId?: string;
  damId?: string;
  birthDate?: string;
  offspringCount?: number;
  femaleOffspring?: number;
  maleOffspring?: number;
  notes?: string;
  createdAt: any;
}

export interface ProductionRecord {
  id: string;
  livestockId: string;
  date: string;
  milkLiters?: number;
  eggCount?: number;
  createdAt: any;
}

export interface NutritionRecord {
  id: string;
  livestockId: string;
  feedType: string;
  amountPerDay: number;
  costPerDay: number;
  date: string;
  createdAt: any;
}

export interface Livestock {
  id: string;
  vendorId: string;
  tagNumber: string;
  name?: string;
  species: string;
  breed: string;
  gender: 'male' | 'female';
  birthDate: string;
  weight?: number;
  age?: string;
  colorMarkings?: string;
  healthStatus: 'Healthy' | 'Sick' | 'Injured';
  vaccinationStatus: 'Vaccinated' | 'Not Vaccinated';
  lastTreatmentDate?: string;
  notes?: string;
  pregnancyStatus?: 'Pregnant' | 'Not Pregnant';
  expectedDeliveryDate?: string;
  location: string;
  farmSection?: string;
  status: 'alive' | 'sold' | 'dead' | 'moved';
  image?: string;
  ownerName: string;
  ownerPhone: string;
  hasBeenLive?: boolean;
  createdAt: any;
}

export interface RecurringOrder {
  id: string;
  userId: string;
  productId: string;
  qty: number;
  frequency: 'weekly' | 'monthly';
  nextDelivery: string;
  status: 'active' | 'paused';
  createdAt: any;
}

export interface SystemSettings {
  id: string;
  imagekit_public_key?: string;
  imagekit_private_key?: string;
  imagekit_url_endpoint?: string;
  firebase_api_key?: string;
  firebase_auth_domain?: string;
  firebase_project_id?: string;
  banners?: { image: string, link: string }[];
  app_logo?: string;
  app_name?: string;
  currency?: string;
  loading_icon?: string;
  loading_url?: string;
  withdrawalFeeType: 'fixed' | 'percentage';
  withdrawalFeeValue: number;
  adminWhatsApp: string;
  paymentNumber: string;
  paymentName: string;
  commissionRate?: number;
  topDoctorFee?: number;
  vendorSubscriptionMonthly?: number;
  vendorSubscriptionYearly?: number;
  paymentMethods?: {
    mpesa?: { number: string, name: string };
    tigopesa?: { number: string, name: string };
    airtel?: { number: string, name: string };
    halopesa?: { number: string, name: string };
  };
  pointsPerOrder?: number; // How many points per 1000 TZS
  pointsValue?: number; // Value of 1 point in TZS
  firebase_service_account?: string;
  maintenanceMode?: boolean;
  themeColor?: string;
  qrColor?: string;
  qrLogo?: string;
  updatedAt: any;
}

export interface AcademyPost {
  id: string;
  title: string;
  content: string;
  image?: string;
  category: 'livestock' | 'crops' | 'marketing' | 'general';
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface LoyaltyPoint {
  id: string;
  userId: string;
  points: number;
  type: 'earned' | 'spent';
  description: string;
  createdAt: any;
}

export interface Invoice {
  id: string;
  orderId: string;
  userId: string;
  vendorId: string;
  amount: number;
  items: OrderItem[];
  date: string;
  createdAt: any;
}
