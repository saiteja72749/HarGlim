import type { Book, ShippingAddress } from "@/types";

interface EntityId {
  _id?: string;
  id?: string;
}

interface Customer extends EntityId {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

interface CheckoutSnapshot extends Customer {
  fullName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: OrderAddress;
}

interface OrderAddress extends ShippingAddress {
  address?: string;
  recipientName?: string;
  recipientPhone?: string;
  mobile?: string;
  mobileNumber?: string;
  phoneNumber?: string;
  contactNumber?: string;
  contactPhone?: string;
}

export interface OrderItem extends EntityId {
  book?: Partial<Book> | string | null;
  title?: string;
  format?: string;
  price?: number;
  quantity?: number;
}

export interface PaymentRecord extends EntityId {
  _id: string;
  amount?: number;
  createdAt?: string;
  currency?: string;
  method?: string;
  order?: (EntityId & { orderNumber?: string; totalPrice?: number }) | string;
  orderId?: string;
  orderNumber?: string;
  paymentMethod?: string;
  provider?: string;
  purpose?: string;
  status?: string;
  reference?: string;
  reason?: string;
  rejectionReason?: string;
  transactionReference?: string;
  utr?: string;
  qrCodeDataUrl?: string;
  upiUrl?: string;
  customer?: Customer;
  user?: Customer;
}

export interface OrderRecord extends EntityId {
  _id: string;
  amount?: number;
  createdAt?: string;
  date?: string;
  estimatedDelivery?: string;
  items?: OrderItem[];
  orderNumber?: string;
  orderStatus?: string;
  status?: string;
  shipmentStatus?: string;
  shipment?: Record<string, unknown> & { status?: string };
  payment?: PaymentRecord | string;
  paymentId?: string;
  paymentMethod?: string;
  paymentState?: string;
  paymentStatus?: string;
  payment_status?: string;
  qrCodeDataUrl?: string;
  utr?: string;
  isPaid?: boolean;
  itemsPrice?: number;
  subtotal?: number;
  shippingFee?: number;
  shippingPrice?: number;
  totalAmount?: number;
  totalPrice?: number;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  customer?: Customer;
  user?: Customer | string;
  customerEmail?: string;
  customerMobile?: string;
  customerName?: string;
  customerPhone?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  phoneNumber?: string;
  recipientPhone?: string;
  checkoutSnapshot?: CheckoutSnapshot;
  customerSnapshot?: CheckoutSnapshot;
  orderFormData?: CheckoutSnapshot;
  address?: OrderAddress;
  billingAddress?: OrderAddress;
  billing_address?: OrderAddress;
  deliveryAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  shipping_address?: OrderAddress;
}

export interface InvoiceRecord extends EntityId {
  _id: string;
  invoiceNumber?: string;
  orderNumber?: string;
  order?: string | EntityId;
  payment?: string | EntityId;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: number;
  paymentStatus?: string;
  items?: OrderItem[];
}

export interface ShipmentRecord extends EntityId {
  _id: string;
  courier?: { provider?: string };
  provider?: string;
  status?: string;
  estimatedDelivery?: string;
  order?: EntityId & { orderNumber?: string };
  orderId?: string;
  orderNumber?: string;
}
