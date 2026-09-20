export interface Book {
  _id: string;
  title: string;
  slug: string;
  author: { _id: string; name: string; email?: string } | string | any;
  category: { _id: string; name: string; slug: string } | string | any;
  description: string;
  coverImage: string;
  mrp?: number;
  price: number;
  discountPrice?: number;
  format: string;
  rating?: number;
  totalReviews?: number;
  totalSales?: number;
  isBestseller?: boolean;
  isNewRelease?: boolean;
  isFeatured?: boolean;
  stock?: number;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  pages?: number;
  language?: string;
  galleryImages?: string[];
  shortDescription?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  edition?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface Author {
  _id: string;
  name: string;
  email: string;
  role?: string;
  bio?: string;
  profileImage?: string;
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
  totalSales?: number;
  revenue?: number;
  bookCount?: number;
  socialLinks?: Record<string, string>;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  bookCount?: number;
}

export interface Review {
  _id: string;
  book: string | Book;
  user: { _id: string; name: string; profileImage?: string };
  rating: number;
  comment: string;
  isApproved?: boolean;
  createdAt: string;
}

export interface ShippingAddress {
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  street?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  pinCode?: string;
  country?: string;
}

export interface Order {
  _id: string;
  user: string | any;
  orderNumber: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'Placed' | 'Printed' | 'Shipped' | string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'verified' | 'VERIFIED' | string;
  payment_status?: 'pending' | 'approved' | 'rejected' | string;
  shippingAddress: ShippingAddress | any;
  createdAt: string;
  courier_name?: string;
  courierName?: string;
  courier?: string;
  carrier?: string;
  tracking_id?: string;
  trackingId?: string;
  trackingNumber?: string;
  tracking_url?: string;
  trackingUrl?: string;
}

export type Role = 'visitor' | 'reader' | 'author' | 'admin';

export interface UserCapabilities {
  canPublish: boolean;
  canAccessAuthorDashboard: boolean;
  canAdminister: boolean;
}

export interface UserStates {
  authorApplicationStatus: string;
  dashboardAccessStatus: string;
  publishingStatus: string;
}

export interface UserContextData {
  user: {
    id: string;
    _id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    profilePicture: string | null;
    createdAt: string;
  };
  capabilities: UserCapabilities;
  states: UserStates;
}

