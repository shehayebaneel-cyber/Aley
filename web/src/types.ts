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

export interface ProductSection {
  title: string;
  items: { name: string; price?: number; description?: string }[];
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
  gallery: string[];
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
  tags: string[];
  faqs: { q: string; a: string }[];
  isFeatured: boolean;
  isVerified: boolean;
  isPublished?: boolean;
  isClaimed?: boolean;
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
  business?: { slug: string; name: string; logo?: string | null; cover?: string | null } | null;
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
  category: { name: string; icon: string; color: string };
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
  offers: Offer[];
  events: EventItem[];
  categories: Category[];
}
