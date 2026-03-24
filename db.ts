import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'livestock.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT,
    walletBalance REAL DEFAULT 0,
    shopName TEXT,
    phone TEXT,
    address TEXT,
    avatar TEXT,
    language TEXT,
    theme TEXT,
    referralCode TEXT,
    referredBy TEXT,
    loyaltyPoints INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price REAL,
    category TEXT,
    image TEXT,
    vendorId TEXT,
    vendorName TEXT,
    stock INTEGER,
    status TEXT,
    unit TEXT,
    emoji TEXT,
    location TEXT,
    region TEXT,
    approved BOOLEAN DEFAULT 0,
    deliveryCity REAL,
    deliveryOut REAL,
    isLivestock BOOLEAN DEFAULT 0,
    age TEXT,
    weight REAL,
    gender TEXT,
    breed TEXT,
    healthStatus TEXT,
    birthDate DATETIME,
    tagNumber TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    userContact TEXT,
    userWA TEXT,
    payPhone TEXT,
    vendorId TEXT,
    vendorName TEXT,
    productId TEXT,
    productPrice REAL,
    qty INTEGER,
    deliveryFee REAL,
    deliveryMethod TEXT,
    total REAL,
    payMethod TEXT,
    senderName TEXT,
    sentAmount TEXT,
    transactionId TEXT,
    status TEXT,
    paymentProof TEXT,
    paymentApproved BOOLEAN DEFAULT 0,
    date DATETIME,
    items TEXT, -- JSON string
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    type TEXT,
    description TEXT,
    text TEXT,
    time TEXT,
    icon TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    vendorName TEXT,
    amount REAL,
    fee REAL,
    netAmount REAL,
    method TEXT,
    network TEXT,
    phoneNumber TEXT,
    bankName TEXT,
    accountNumber TEXT,
    accountName TEXT,
    status TEXT,
    date DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    vendorName TEXT,
    vendorPhone TEXT,
    productName TEXT,
    description TEXT,
    startingPrice REAL,
    minIncrement REAL,
    currentBid REAL,
    highestBidderId TEXT,
    highestBidderName TEXT,
    endTime DATETIME,
    location TEXT,
    status TEXT,
    image TEXT,
    winnerId TEXT,
    winnerName TEXT,
    paymentStatus TEXT,
    paymentMethod TEXT,
    transactionId TEXT,
    senderPhone TEXT,
    senderName TEXT,
    totalAmount REAL,
    tagNumber TEXT,
    breed TEXT,
    age TEXT,
    weight REAL,
    gender TEXT,
    healthStatus TEXT,
    birthDate DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    auctionId TEXT,
    userId TEXT,
    userName TEXT,
    amount REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    amount REAL,
    type TEXT,
    status TEXT,
    method TEXT,
    senderName TEXT,
    senderPhone TEXT,
    transactionId TEXT,
    date DATETIME,
    description TEXT,
    withdrawalId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    message TEXT,
    image TEXT,
    link TEXT,
    date DATETIME,
    readBy TEXT, -- JSON array of user IDs
    deletedBy TEXT, -- JSON array of user IDs
    type TEXT,
    icon TEXT,
    text TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    productId TEXT,
    vendorId TEXT,
    userId TEXT,
    userName TEXT,
    userAvatar TEXT,
    rating INTEGER,
    text TEXT,
    date DATETIME,
    likes TEXT, -- JSON array
    reactions TEXT, -- JSON array
    replies TEXT, -- JSON array
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    vendorName TEXT,
    vendorAvatar TEXT,
    text TEXT,
    videoUrl TEXT,
    likes TEXT, -- JSON array
    comments TEXT, -- JSON array
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT,
    emoji TEXT,
    image TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS livestock (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    tagNumber TEXT,
    name TEXT,
    species TEXT,
    breed TEXT,
    gender TEXT,
    birthDate DATETIME,
    weight REAL,
    status TEXT,
    image TEXT,
    ownerName TEXT,
    ownerPhone TEXT,
    location TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS livestock_health (
    id TEXT PRIMARY KEY,
    productId TEXT,
    type TEXT,
    title TEXT,
    date DATETIME,
    notes TEXT,
    performedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vaccination_records (
    id TEXT PRIMARY KEY,
    userId TEXT,
    livestockId TEXT,
    birdType TEXT,
    vaccineName TEXT,
    date DATETIME,
    nextDueDate DATETIME,
    notes TEXT,
    completed BOOLEAN DEFAULT 0,
    cost REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    livestockId TEXT,
    disease TEXT,
    medicine TEXT,
    date DATETIME,
    cost REAL,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS breeding_records (
    id TEXT PRIMARY KEY,
    livestockId TEXT,
    matingDate DATETIME,
    sireId TEXT,
    damId TEXT,
    birthDate DATETIME,
    offspringCount INTEGER,
    femaleOffspring INTEGER,
    maleOffspring INTEGER,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS production_records (
    id TEXT PRIMARY KEY,
    livestockId TEXT,
    date DATETIME,
    milkLiters REAL,
    eggCount INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nutrition_records (
    id TEXT PRIMARY KEY,
    livestockId TEXT,
    feedType TEXT,
    amountPerDay REAL,
    costPerDay REAL,
    date DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recurring_orders (
    id TEXT PRIMARY KEY,
    userId TEXT,
    productId TEXT,
    qty INTEGER,
    frequency TEXT,
    nextDelivery DATETIME,
    status TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS live_sessions (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    title TEXT,
    status TEXT,
    viewerCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS academy (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    image TEXT,
    category TEXT,
    authorId TEXT,
    authorName TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loyalty (
    id TEXT PRIMARY KEY,
    userId TEXT,
    points INTEGER,
    type TEXT,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    userId TEXT,
    vendorId TEXT,
    amount REAL,
    items TEXT, -- JSON string
    date DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS forum (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    userAvatar TEXT,
    title TEXT,
    content TEXT,
    image TEXT,
    likes TEXT, -- JSON string
    comments TEXT, -- JSON string
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    receiverId TEXT,
    text TEXT,
    image TEXT,
    read BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS live_chats (
    id TEXT PRIMARY KEY,
    roomId TEXT,
    userId TEXT,
    userName TEXT,
    text TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'settings',
    imagekit_public_key TEXT,
    imagekit_private_key TEXT,
    imagekit_url_endpoint TEXT,
    app_logo TEXT,
    app_name TEXT,
    currency TEXT,
    withdrawalFeeType TEXT DEFAULT 'fixed',
    withdrawalFeeValue REAL DEFAULT 0,
    adminWhatsApp TEXT,
    paymentNumber TEXT,
    paymentName TEXT,
    pointsPerOrder REAL,
    pointsValue REAL,
    maintenanceMode BOOLEAN DEFAULT 0,
    themeColor TEXT,
    qrColor TEXT,
    qrLogo TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default settings if not exists
  INSERT OR IGNORE INTO settings (id, withdrawalFeeType, withdrawalFeeValue, app_name)
  VALUES ('settings', 'fixed', 500, 'Kuku Livestock');
`);

// Migration: Add missing columns if they don't exist
try { db.exec("ALTER TABLE activity ADD COLUMN text TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE activity ADD COLUMN time TEXT;"); } catch (e) {}

export default db;
