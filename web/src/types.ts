export interface City {
  id: number;
  slug: string;
  name: string;
  nameAr: string;
  tagline: string;
  lat: number;
  lng: number;
  isActive: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  group?: string;
  icon: string;
  color: string;
  count?: number;
}

export interface LostFoundItem {
  id: number;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  image: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: "OPEN" | "RESOLVED";
  isPublished: boolean;
  createdAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  image: string | null;
  link: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface DriverJob {
  kind: "courier" | "order";
  id: number;
  number: string;
  typeLabel: string;
  statusKey: string;
  next: { status: string; label: string } | null;
  canAccept: boolean;
  pickupLabel: string;
  pickupPhone: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupOutside: boolean;
  dropoffLabel: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffOutside: boolean;
  itemDescription: string;
  packageType: string;
  packageSize: string;
  urgency: string;
  preferredTime: string;
  distanceKm: number;
  amountLabel: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  driverNotes: string;
  proofImage: string | null;
  supportsProof: boolean;
  businesses: { name: string; address: string; phone: string; lat: number | null; lng: number | null }[];
  items: { name: string; quantity: number }[];
  createdAt: string;
}

export interface DeliveryEstimate {
  distanceKm: number;
  outsideCount: number;
  pickupOutside: boolean;
  dropoffOutside: boolean;
  min: number;
  max: number;
  breakdown: { label: string; amount: number }[];
}

export interface DeliveryRequest {
  id: number;
  number: string;
  type: string;
  pickupLabel: string;
  pickupPhone: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupOutside: boolean;
  dropoffLabel: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffOutside: boolean;
  itemDescription: string;
  packageType: string;
  packageSize: string;
  urgency: string;
  preferredTime: string;
  notes: string;
  customerName: string;
  customerPhone: string;
  distanceKm: number;
  estimatedMin: number;
  estimatedMax: number;
  finalPrice: number | null;
  status: string;
  driverId: number | null;
  driverName: string;
  driverPhone: string;
  driverNotes: string;
  proofImage: string | null;
  createdAt: string;
}

export interface HoursRow {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface Review {
  id: number;
  authorName: string;
  rating: number;
  comment: string;
  reply: string | null;
  createdAt: string;
}

/** A single selectable choice within an option group (e.g. "Large", "Oat Milk"). */
export interface ProductChoice {
  label: string;
  /** Extra charge added to the base price when chosen. Omit/0 = free. */
  price?: number;
}

/** A group of customization choices for a product (e.g. "Size", "Milk", "Extras"). */
export interface ProductOptionGroup {
  name: string;
  /** "single" = pick one (radio); "multi" = pick any (checkboxes). */
  type: "single" | "multi";
  required?: boolean;
  choices: ProductChoice[];
}

export interface ProductItem {
  name: string;
  price?: number;
  description?: string;
  image?: string | null;
  /** Featured items surface at the top of the menu. */
  featured?: boolean;
  /** Optional ribbon, e.g. "Best Seller", "New", "Most Popular". */
  badge?: string;
  /** When false, the item is shown as unavailable and can't be ordered. */
  available?: boolean;
  /** Dietary tags: "vegetarian" | "vegan" | "gluten-free". */
  diet?: string[];
  ingredients?: string;
  allergens?: string;
  options?: ProductOptionGroup[];
}

export interface ProductSection {
  title: string;
  items: ProductItem[];
}

/** A gallery photo with an optional caption. */
export interface GalleryImage {
  url: string;
  caption?: string;
}

// ---- Appointment booking ----
export interface Service {
  id: number;
  businessId?: number;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface TimeOff { from: string; to: string }
export interface StaffSchedule {
  workingHours?: HoursRow[];
  breaks?: BookingBreak[];
  daysOff?: string[];
  timeOff?: TimeOff[];
}

export interface StaffMember {
  id: number;
  businessId?: number;
  name: string;
  role: string;
  avatar: string | null;
  bio?: string;
  experience?: string;
  languages?: string[];
  rating?: number;
  schedule?: StaffSchedule;
  isActive: boolean;
  sortOrder?: number;
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Appointment {
  id: number;
  businessId: number;
  serviceId: number | null;
  staffId: number | null;
  customerName: string;
  customerPhone: string;
  note: string;
  date: string;
  time: string;
  durationMin: number;
  price: number;
  serviceName: string;
  staffName: string;
  status: AppointmentStatus;
  checkInCode?: string;
  arrivedAt?: string | null;
  createdAt: string;
  business?: { name: string; slug: string; logo: string | null };
}

export interface WaitlistEntry {
  id: number;
  businessId: number;
  customerName: string;
  customerPhone: string;
  date: string;
  note: string;
  status: "WAITING" | "NOTIFIED" | "CONVERTED" | "CLOSED";
  createdAt: string;
}

export type BookingMode = "none" | "appointment" | "service" | "table" | "choice";

// ---- Finance / accounting ----
export interface Transaction {
  id: number;
  source: string;
  refId: number;
  code: string;
  description: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  commission: number;
  deliveryFee: number;
  net: number;
  refundedAmount: number;
  status: string; // payment status
  method: string;
  payoutStatus: string;
  notes: string;
  createdAt: string;
  refundedAt: string | null;
  business?: { name: string; slug: string };
}
export interface Wallet {
  totalSales: number; commission: number; refunds: number;
  pendingBalance: number; availableBalance: number; inPayout: number; paidOut: number;
  lifetimeEarnings: number; outstandingBalance: number;
}
export interface Payout {
  id: number; businessId: number; periodStart: string; periodEnd: string;
  grossSales: number; commission: number; refunds: number; adjustments: number; net: number;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED"; method: string; notes: string;
  createdAt: string; paidAt: string | null; business?: { name: string; slug: string };
}
export interface AdminFinance {
  totalSales: number; platformRevenue: number; commissions: number; deliveryFees: number;
  owedToBusinesses: number; paidOut: number; pendingPayouts: number; refunds: number; failed: number; transactions: number;
}

// ---- Gift vouchers ----
export type VoucherKind = "FIXED" | "PRODUCT" | "SERVICE";
export interface VoucherType {
  id: number;
  kind: VoucherKind;
  name: string;
  description: string;
  image: string | null;
  value: number;
  price: number;
  expiryDays: number;
  maxQuantity?: number;
  soldCount?: number;
  status?: string;
  terms: string;
}
export interface Voucher {
  code: string;
  kind: string;
  title: string;
  value: number;
  balance: number;
  price?: number;
  status: string;
  expiresAt: string | null;
  deliverAt?: string | null;
  message?: string;
  recipientName?: string;
  mine?: boolean;
  business?: { name: string; slug: string; logo: string | null };
  createdAt?: string;
}
export interface VoucherStats {
  sold: number; revenue: number; redeemed: number; types: number;
  redemptionRate: number; avgValue: number; mostPopular: { name: string; count: number } | null; outstandingLiability: number;
}

// ---- Facility (hourly rental) booking ----
export interface Facility {
  id: number;
  name: string;
  type: string;
  description: string;
  image: string | null;
  hourlyRate: number;
  capacityNote: string;
  pricing?: { weekendRate?: number; peakRate?: number; peakStart?: string; peakEnd?: string; nightRate?: number; nightStart?: string; holidayRate?: number; minHours?: number; maxHours?: number; slotIncrementMin?: number };
  schedule?: { workingHours?: HoursRow[]; blockedDates?: string[]; maintenance?: { from: string; to: string; reason?: string }[] };
  isActive?: boolean;
  sortOrder?: number;
  durations?: number[];
}
export interface FacilitySlot { time: string; price: number }
export interface FacilityBooking {
  id: number;
  businessId: number;
  facilityId: number;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  durationMin: number;
  players: number;
  note: string;
  price: number;
  facilityName: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  checkInCode?: string;
  arrivedAt?: string | null;
  createdAt: string;
  business?: { name: string; slug: string; logo: string | null };
}
export interface FacilityStats {
  period: string; totalBookings: number; bookedHours: number; revenue: number; occupancyPct: number; cancelled: number;
  busiestFacility: { name: string; count: number } | null; peakHours: { hour: string; count: number }[];
}

export interface BookingAnalytics {
  period: string;
  total: number;
  pending: number;
  confirmed: number;
  rescheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
  avgValue: number;
  topService: { name: string; count: number } | null;
  topStaff: { name: string; count: number } | null;
  peakHours: { hour: string; count: number }[];
}

export interface CustomerHistory {
  phone: string;
  name: string;
  tag: string;
  storedTag: string;
  suggestedTag: string;
  notes: string;
  visits: number;
  completed: number;
  noShows: number;
  spent: number;
  lastVisit: string | null;
  appointments: Appointment[];
}

export interface BookingBreak { day: number; start: string; end: string }
export interface BookingConfig {
  workingHours?: HoursRow[];
  breaks?: BookingBreak[];
  daysOff?: string[];
  slotInterval?: number;
  capacity?: number;
  leadTimeHours?: number;
  horizonDays?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  maxPerDay?: number;
  cancellationHours?: number;
  allowCustomerCancel?: boolean;
  allowCustomerReschedule?: boolean;
  mode?: "" | BookingMode;
  policyNote?: string;
}

export interface Business {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  products?: ProductSection[];
  productLabel?: string;
  ownerName?: string;
  logo: string | null;
  cover: string | null;
  gallery: GalleryImage[];
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  website: string;
  email: string;
  address: string;
  lat: number | null;
  lng: number | null;
  hours: HoursRow[];
  openNow: boolean;
  priceRange: number;
  hasDelivery: boolean;
  hasReservations: boolean;
  hasBooking?: boolean;
  bookingConfig?: BookingConfig;
  bookingMode?: BookingMode;
  bookingCta?: string;
  appointmentBookable?: boolean;
  hasFacilities?: boolean;
  facilities?: Facility[];
  hasVouchers?: boolean;
  tags: string[];
  faqs: { q: string; a: string }[];
  isFeatured: boolean;
  isVerified: boolean;
  isPublished?: boolean;
  isClaimed?: boolean;
  reviewStatus?: "APPROVED" | "PENDING" | "REJECTED";
  commissionRate?: number;
  rating: number;
  reviewCount: number;
  viewCount: number;
  category: Category;
  city?: { slug: string; name: string; lat?: number; lng?: number };
  reviews?: Review[];
  offers?: Offer[];
  events?: EventItem[];
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string | null;
  location: string;
  startTime: string;
  endTime: string | null;
  business?: { slug: string; name: string; logo?: string | null } | null;
}

export interface Offer {
  id: number;
  title: string;
  description: string;
  type: string;
  image: string | null;
  startDate: string | null;
  endDate: string | null;
  business?: {
    slug: string;
    name: string;
    logo?: string | null;
    cover?: string | null;
    category?: { slug: string; name: string; group: string; icon: string; color: string } | null;
  } | null;
}

export interface MapPin {
  slug: string;
  name: string;
  logo: string | null;
  cover: string | null;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  openNow: boolean;
  category: { name: string; slug: string; icon: string; color: string; group: string };
  tags: string[];
  hasDelivery: boolean;
  hasReservations: boolean;
  priceRange: number;
}

// ---- Community Projects ----
export type ProjectStatus = "PROPOSED" | "FUNDING" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED";

export interface Milestone {
  label: string;
  date: string;
  done: boolean;
}

export interface ProjectDonation {
  donorName: string;
  amount: number;
  message: string;
  anonymous: boolean;
  createdAt: string;
}

export interface ProjectExpense {
  id: number;
  label: string;
  amount: number;
  receipt: string | null;
  contractor: string;
  createdAt: string;
}

export interface ProjectUpdate {
  id: number;
  title: string;
  body: string;
  images: string[];
  createdAt: string;
}

export interface ProjectComment {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  description: string;
  type: string;
  location: string;
  lat: number | null;
  lng: number | null;
  beforePhotos: string[];
  proposedPhotos: string[];
  progressPhotos: string[];
  timeline: Milestone[];
  manager: string;
  fundingGoal: number;
  amountRaised: number;
  contributorCount: number;
  voteCount: number;
  status: ProjectStatus;
  isFeatured: boolean;
  isPublished?: boolean;
  finalCost: number | null;
  completedReport: string;
  submittedBy: string;
  createdAt: string;
  // detail-only
  donations?: ProjectDonation[];
  expenses?: ProjectExpense[];
  updates?: ProjectUpdate[];
  comments?: ProjectComment[];
  followerCount?: number;
  hasVoted?: boolean;
  isFollowing?: boolean;
  _count?: { donations: number; comments: number };
}

export interface ProjectSummary {
  active: number;
  completed: number;
  totalRaised: number;
  contributors: number;
  featured: Project[];
}

// ---- Admin notifications & ownership claims ----
export interface AdminNotification {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface BusinessClaim {
  id: number;
  businessId: number;
  ownerId: number;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  business?: { id: number; name: string; slug: string; logo?: string | null; cover?: string | null; isClaimed?: boolean };
  owner?: { id: number; name: string; email: string; phone: string };
}

export interface Reservation {
  id: number;
  businessId: number;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  date: string;
  time: string;
  note: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  createdAt: string;
}

export interface ClaimableBusiness {
  id: number;
  name: string;
  address: string;
  logo?: string | null;
  cover?: string | null;
  category?: Category | null;
}

// ---- Marketplace orders ----
export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}
export interface BusinessOrder {
  id: number;
  businessId: number;
  status: "PENDING" | "PREPARING" | "READY" | "CANCELLED";
  prepTime: string;
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  items: OrderItem[];
  business?: { name: string; slug: string; logo?: string | null; address?: string; phone?: string };
  order?: { number: string; customerName: string; customerPhone: string; fulfillment: string; address: string; note: string; deliveryStatus: string; createdAt: string; lat?: number | null; lng?: number | null };
}
export interface MarketOrder {
  id: number;
  number: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fulfillment: "DELIVERY" | "PICKUP";
  address: string;
  lat: number | null;
  lng: number | null;
  note: string;
  itemsSubtotal: number;
  deliveryFee: number;
  total: number;
  commissionTotal: number;
  paymentMethod: "CASH" | "ONLINE";
  paid: boolean;
  deliveryStatus: "PENDING" | "COLLECTING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  driverName: string;
  status: string;
  createdAt: string;
  businessOrders: BusinessOrder[];
}

export interface HomeData {
  city: City | null;
  totalBusinesses: number;
  stats: { businesses: number; categories: number; events: number; offers: number };
  featured: Business[];
  newest: Business[];
  popular: Business[];
  gift?: Business[];
  offers: Offer[];
  events: EventItem[];
  categories: Category[];
  groups: { group: string; icon: string; color: string; count: number; categories: number }[];
}
