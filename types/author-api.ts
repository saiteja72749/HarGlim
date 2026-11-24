import type { Book } from '@/types';

export type AuthorMetrics = Partial<Record<
  'unitsSold' | 'totalSales' | 'sales' | 'copiesSold' | 'soldCount' | 'grossRevenue' | 'grossBookRevenue' | 'revenue' |
  'knownAccruedRoyalty' | 'knownRoyalty' | 'royalty' | 'royaltyEarned' | 'accruedRoyalty' | 'royaltyAmount' |
  'units' | 'quantity' | 'totalUnitsSold' | 'historicalUnresolvedSales' | 'unresolvedSales' | 'historicalUnresolvedCount' |
  'unresolvedLegacyCount' | 'accruedKnown' | 'ratings' | 'rating', number>>;

export interface BookPerformance extends AuthorMetrics {
  _id?: string;
  id?: string;
  bookId?: string;
  title?: string;
  status?: string;
  publishingStatus?: string;
  book?: Partial<AuthorBook>;
  royaltyPerCopy?: number | null;
}

export interface AuthorBook extends Partial<Book>, AuthorMetrics {
  _id: string;
  title: string;
  bookId?: string;
  status?: string;
  performance?: BookPerformance;
  publishingStatus?: string;
  publishRequestStatus?: string;
  reviewStatus?: string;
  submissionStatus?: string;
  publishRequest?: { status?: string };
  latestPublishRequest?: { status?: string };
  submission?: { status?: string };
  review?: { status?: string };
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  wordCount?: number;
  manuscriptUrl?: string;
  manuscriptFileUrl?: string;
  manuscriptFile?: string;
  packageId?: string;
  royaltyPercentage?: number;
  royaltyPerCopy?: number;
  printingCost?: number;
  platformCharges?: number;
  deliveryCharges?: number;
}

export interface AnalyticsPoint extends AuthorMetrics { _id?: string; date?: string; day?: string }
export interface AuthorAnalytics extends AuthorMetrics {
  period?: string;
  startDate?: string;
  endDate?: string;
  summary?: AuthorMetrics;
  totals?: AuthorMetrics;
  series?: AnalyticsPoint[];
  daily?: AnalyticsPoint[];
  timeSeries?: AnalyticsPoint[];
  data?: AnalyticsPoint[];
}

export interface AuthorAccessPlan {
  _id?: string;
  id?: string;
  name?: string;
  amount?: number;
  currency?: string;
  description?: string;
  status?: string;
}

export interface AuthorAccessPurchase {
  _id?: string;
  id?: string;
  userId?: string;
  user?: { name?: string };
  amount?: number;
  status?: string;
  createdAt?: string;
  utr?: string;
  qrCodeDataUrl?: string;
  qrMetadata?: { qrCodeDataUrl?: string; qrCodeUrl?: string; upiId?: string };
}
