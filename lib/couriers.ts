import { getSafeExternalUrl } from "@/lib/utils";

// Technical URL formatting only; no carrier availability or service configuration is inferred.
export function resolveCourierTrackingUrl(
  courier: string,
  trackingNumber: string,
  customUrl?: string | null
): string {
  const safeCustomUrl = getSafeExternalUrl(customUrl);
  if (safeCustomUrl) {
    return safeCustomUrl;
  }

  const cleanTracking = (trackingNumber || "").trim();
  const rawCourier = (courier || "").trim();
  const c = rawCourier.toLowerCase();
  const encodedTracking = encodeURIComponent(cleanTracking);

  if (!cleanTracking) return "";

  // Digital Delivery has no external tracking link
  if (c.includes("digital")) {
    return "";
  }

  // Fuzzy match keywords
  if (c.includes("blue") || c.includes("bluedart")) {
    return `https://www.bluedart.com/tracking?trackNumber=${encodedTracking}`;
  }
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${encodedTracking}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/tracking/tracking_results.asp?trackId=${encodedTracking}`;
  }
  if (c.includes("speed post") || c.includes("speed") || c.includes("india post") || c.includes("post")) {
    return `https://www.indiapost.gov.in/_layouts/15/dptcp.gear.uip/ItemTracking.aspx?ConsignmentId=${encodedTracking}`;
  }
  if (c.includes("amazon")) {
    return `https://track.amazon.in/tracking/${encodedTracking}`;
  }
  if (c.includes("xpressbees")) {
    return `https://www.xpressbees.com/track?isawb=Yes&trackid=${encodedTracking}`;
  }
  if (c.includes("shadowfax")) {
    return `https://tracker.shadowfax.in/#/track?awb=${encodedTracking}`;
  }
  if (c.includes("ecom")) {
    return `https://ecomexpress.in/tracking/?awb=${encodedTracking}`;
  }
  if (c.includes("shiprocket")) {
    return `https://shiprocket.co/tracking/${encodedTracking}`;
  }
  if (c.includes("maruti")) {
    return `https://www.shreemaruticourier.com/track-shipment/?tracking_no=${encodedTracking}`;
  }
  if (c.includes("tirupati")) {
    return `https://www.shreetirupaticourier.net/track.aspx?awb=${encodedTracking}`;
  }
  if (c.includes("professional")) {
    return `https://www.tpcindia.com/tracking.aspx?type=doc&docid=${encodedTracking}`;
  }
  if (c.includes("gati")) {
    return `https://www.gati.com/track/?dkt=${encodedTracking}`;
  }
  if (c.includes("safexpress")) {
    return `http://www.safexpress.com/track/waybill/${encodedTracking}`;
  }
  if (c.includes("ithink")) {
    return `https://ithinklogistics.com/track-order?awb=${encodedTracking}`;
  }

  // Do not expose tracking references to a search service for unknown carriers.
  return '';
}
