export type MoneyInput = number | string | null;
export interface RoyaltyLine extends Partial<Record<
  'quantity' | 'copiesSold' | 'qty' | 'unitPrice' | 'price' | 'amountPerBook' | 'mrp' |
  'grossBookRevenue' | 'lineTotal' | 'grossAmount' | 'totalRevenue' | 'revenue' |
  'royaltyAmount' | 'royalty' | 'amount' | 'royaltyPerCopy' | 'royaltyPerCopySnapshot' | 'royaltyPercentageSnapshot' | 'totalCharges', MoneyInput>> {
  _id?: string;
  bookId?: string | null;
  bookTitle?: string;
  title?: string;
  book?: { _id?: string; title?: string };
  order?: { _id?: string; orderNumber?: string };
  orderNumber?: string;
  royaltyStatus?: string;
  status?: string;
  saleDate?: string;
  date?: string;
  soldAt?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface PayoutRecord {
  transactionReference?: string;
  paymentMethod?: string;
  method?: string;
  paidAt?: string;
  notes?: string;
}
export interface RoyaltySettlement extends PayoutRecord {
  _id: string;
  id?: string;
  settlementNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  totalRoyalty?: MoneyInput;
  amount?: MoneyInput;
  totalAmount?: MoneyInput;
  payoutAmount?: MoneyInput;
  status?: string;
  paymentStatus?: string;
  payment?: PayoutRecord;
  payout?: PayoutRecord;
  payoutDetails?: PayoutRecord;
  items?: RoyaltyLine[];
  lines?: RoyaltyLine[];
  sourceLines?: RoyaltyLine[];
  royalties?: RoyaltyLine[];
}
