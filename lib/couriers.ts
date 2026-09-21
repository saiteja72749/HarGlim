export interface DeliveryPlan {
  id: string;
  name: string;
  category: "National Express" | "Surface & Freight" | "Hyperlocal & Rapid" | "Cross-Border & Global" | "Postal" | "Digital / Virtual";
  prefix: string;
  website: string;
  description: string;
  isActive: boolean;
}

export const DELIVERY_PLANS: DeliveryPlan[] = [
  {
    id: "dotzot",
    name: "Dotzot",
    category: "National Express",
    prefix: "http://www.dotzot.in/tracking/",
    website: "http://www.dotzot.in",
    description: "eCommerce delivery arm of DTDC for retail & express shipments",
    isActive: true,
  },
  {
    id: "delhivery",
    name: "Delhivery",
    category: "National Express",
    prefix: "https://www.delhivery.com/track/package/",
    website: "https://www.delhivery.com",
    description: "Integrated express parcel, surface, and freight network across India",
    isActive: true,
  },
  {
    id: "india-post",
    name: "India Post",
    category: "Postal",
    prefix: "https://www.indiapost.gov.in/_layouts/15/dptcp.gear.uip/ItemTracking.aspx?ConsignmentId=",
    website: "https://www.indiapost.gov.in",
    description: "Government postal network & Speed Post reaching all PIN codes across India",
    isActive: true,
  },
  {
    id: "amazon-shipping",
    name: "Amazon Shipping",
    category: "National Express",
    prefix: "https://track.amazon.in/tracking/",
    website: "https://shipping.amazon.in",
    description: "Dedicated ground & air logistics network powered by Amazon",
    isActive: true,
  },
  {
    id: "b2cship-exp",
    name: "B2CShip Exp",
    category: "Cross-Border & Global",
    prefix: "https://b2cship.com/tracking?awb=",
    website: "https://b2cship.com",
    description: "Global cross-border parcel delivery and e-commerce express",
    isActive: true,
  },
  {
    id: "blitz",
    name: "BLITZ",
    category: "Hyperlocal & Rapid",
    prefix: "https://track.tryblitz.com/track/",
    website: "https://tryblitz.com",
    description: "Rapid same-day and scheduled intra-city delivery services",
    isActive: true,
  },
  {
    id: "baral-logistics",
    name: "Baral Logistics",
    category: "Surface & Freight",
    prefix: "https://barallogistics.com/tracking.php?awb=",
    website: "https://barallogistics.com",
    description: "Regional surface parcel transportation and distribution",
    isActive: true,
  },
  {
    id: "blowhorn",
    name: "Blowhorn",
    category: "Hyperlocal & Rapid",
    prefix: "https://blowhorn.com/track/",
    website: "https://blowhorn.com",
    description: "Intra-city micro-warehousing and same-day delivery",
    isActive: true,
  },
  {
    id: "bluedart",
    name: "BlueDart",
    category: "National Express",
    prefix: "https://www.bluedart.com/tracking?trackNumber=",
    website: "https://www.bluedart.com",
    description: "South Asia's premier air express courier and cargo network",
    isActive: true,
  },
  {
    id: "bombax",
    name: "Bombax",
    category: "National Express",
    prefix: "https://bombax.in/track?tracking_no=",
    website: "https://bombax.in",
    description: "Express courier, cargo, and reverse logistics solutions",
    isActive: true,
  },
  {
    id: "cart2india",
    name: "Cart2India",
    category: "Cross-Border & Global",
    prefix: "https://cart2india.com/track-order?awb=",
    website: "https://cart2india.com",
    description: "Cross-border import fulfillment and customs cleared delivery",
    isActive: true,
  },
  {
    id: "dpworld",
    name: "DPWorld",
    category: "Surface & Freight",
    prefix: "https://www.dpworld.com/track-and-trace?id=",
    website: "https://www.dpworld.com",
    description: "Multimodal logistics, rail freight, and port-to-door distribution",
    isActive: true,
  },
  {
    id: "dtdc",
    name: "DTDC",
    category: "National Express",
    prefix: "https://www.dtdc.in/tracking/tracking_results.asp?trackId=",
    website: "https://www.dtdc.in",
    description: "Domestic & international express parcel service network",
    isActive: true,
  },
  {
    id: "digital-delivery",
    name: "Digital Delivery",
    category: "Digital / Virtual",
    prefix: "",
    website: "",
    description: "Instant digital fulfillment (eBooks, audiobooks, PDF download links via email/portal)",
    isActive: true,
  },
  {
    id: "ecom-express",
    name: "Ecom Express",
    category: "National Express",
    prefix: "https://ecomexpress.in/tracking/?awb=",
    website: "https://ecomexpress.in",
    description: "Dedicated end-to-end e-commerce logistics and doorstep services",
    isActive: true,
  },
  {
    id: "gati",
    name: "Gati",
    category: "Surface & Freight",
    prefix: "https://www.gati.com/track/?dkt=",
    website: "https://www.gati.com",
    description: "Pioneer in express distribution and supply chain in India",
    isActive: true,
  },
  {
    id: "gojavas",
    name: "Gojavas",
    category: "National Express",
    prefix: "https://gojavas.com/track?awb=",
    website: "https://gojavas.com",
    description: "Technology-enabled e-commerce supply chain & express network",
    isActive: true,
  },
  {
    id: "icc-worldwide",
    name: "ICC Worldwide",
    category: "Cross-Border & Global",
    prefix: "https://iccworld.com/track/",
    website: "https://iccworld.com",
    description: "International shipping, customs clearance, and courier dispatch",
    isActive: true,
  },
  {
    id: "lemmonmode",
    name: "Lemmonmode",
    category: "National Express",
    prefix: "https://lemonmode.com/track/",
    website: "https://lemonmode.com",
    description: "Specialized D2C retail and express courier carrier",
    isActive: true,
  },
  {
    id: "naplog-logistics",
    name: "Naplog Logistics",
    category: "Surface & Freight",
    prefix: "https://naplog.in/track?cn=",
    website: "https://naplog.in",
    description: "Commercial parcel transit and regional logistics services",
    isActive: true,
  },
  {
    id: "pidge",
    name: "Pidge",
    category: "Hyperlocal & Rapid",
    prefix: "https://track.pidge.in/",
    website: "https://pidge.in",
    description: "Radius-free on-demand intra-city delivery ecosystem",
    isActive: true,
  },
  {
    id: "quickshift",
    name: "QuickShift",
    category: "Hyperlocal & Rapid",
    prefix: "https://quickshift.in/track/",
    website: "https://quickshift.in",
    description: "Rapid fulfillment, same-day delivery, and 3PL courier solutions",
    isActive: true,
  },
  {
    id: "rivigo",
    name: "Rivigo",
    category: "Surface & Freight",
    prefix: "https://www.rivigo.com/express-tracking/",
    website: "https://www.rivigo.com",
    description: "Relay-led express freight network with reduced transit times",
    isActive: true,
  },
  {
    id: "safexpress",
    name: "Safexpress",
    category: "Surface & Freight",
    prefix: "http://www.safexpress.com/track/waybill/",
    website: "http://www.safexpress.com",
    description: "Supply chain and pan-India express surface & air cargo network",
    isActive: true,
  },
  {
    id: "shadowfax",
    name: "Shadowfax",
    category: "Hyperlocal & Rapid",
    prefix: "https://tracker.shadowfax.in/#/track?awb=",
    website: "https://www.shadowfax.in",
    description: "Hyperlocal, same-day, and reverse logistics network",
    isActive: true,
  },
  {
    id: "shipglobal",
    name: "Shipglobal",
    category: "Cross-Border & Global",
    prefix: "https://www.shipglobal.in/track/",
    website: "https://www.shipglobal.in",
    description: "Global cross-border parcel delivery for Indian merchants",
    isActive: true,
  },
  {
    id: "shiprocket-quick",
    name: "Shiprocket Quick",
    category: "Hyperlocal & Rapid",
    prefix: "https://shiprocket.co/tracking/",
    website: "https://shiprocket.co",
    description: "Fast local courier service powered by Shiprocket platform",
    isActive: true,
  },
  {
    id: "shree-maruti-courier",
    name: "Shree Maruti Courier",
    category: "National Express",
    prefix: "https://www.shreemaruticourier.com/track-shipment/?tracking_no=",
    website: "https://www.shreemaruticourier.com",
    description: "Trusted domestic courier network with wide branch coverage",
    isActive: true,
  },
  {
    id: "shree-tirupati-courier",
    name: "Shree Tirupati Courier",
    category: "National Express",
    prefix: "https://www.shreetirupaticourier.net/track.aspx?awb=",
    website: "https://www.shreetirupaticourier.net",
    description: "Extensive overnight and surface courier parcel provider",
    isActive: true,
  },
  {
    id: "the-professional-couriers",
    name: "The Professional Couriers",
    category: "National Express",
    prefix: "https://www.tpcindia.com/tracking.aspx?type=doc&docid=",
    website: "https://www.tpcindia.com",
    description: "Pioneering courier and parcel tracking network in India",
    isActive: true,
  },
  {
    id: "vancotech",
    name: "Vancotech",
    category: "Surface & Freight",
    prefix: "https://vancotech.com/track/",
    website: "https://vancotech.com",
    description: "Smart logistics dispatch, fleet tracking, and cargo delivery",
    isActive: true,
  },
  {
    id: "xpressbees",
    name: "Xpressbees",
    category: "National Express",
    prefix: "https://www.xpressbees.com/track?isawb=Yes&trackid=",
    website: "https://www.xpressbees.com",
    description: "Pan-India e-commerce logistics and express cargo solutions",
    isActive: true,
  },
  {
    id: "yanwen",
    name: "Yanwen",
    category: "Cross-Border & Global",
    prefix: "https://track.yw56.com.cn/en/query?nums=",
    website: "https://www.yanwenlogistics.cn",
    description: "Cross-border international express and postal line",
    isActive: true,
  },
  {
    id: "zippee",
    name: "Zippee",
    category: "Hyperlocal & Rapid",
    prefix: "https://zippee.delivery/track/",
    website: "https://zippee.delivery",
    description: "Rapid 10-45 minute same-day quick-commerce delivery",
    isActive: true,
  },
  {
    id: "ithink-logistics",
    name: "iThink Logistics",
    category: "National Express",
    prefix: "https://ithinklogistics.com/track-order?awb=",
    website: "https://ithinklogistics.com",
    description: "AI-powered automated multi-carrier logistics platform",
    isActive: true,
  },
  {
    id: "other-custom",
    name: "Other / Custom Courier",
    category: "National Express",
    prefix: "",
    website: "",
    description: "Custom local courier or manual consignment tracking",
    isActive: true,
  },
];

/**
 * Resolves a live tracking URL given a courier service name and tracking number.
 */
export function resolveCourierTrackingUrl(
  courier: string,
  trackingNumber: string,
  customUrl?: string | null
): string {
  if (customUrl && (customUrl.startsWith("http://") || customUrl.startsWith("https://"))) {
    return customUrl;
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

  // Exact match from DELIVERY_PLANS
  const matched = DELIVERY_PLANS.find(
    (p) =>
      p.name.toLowerCase() === c ||
      p.id.toLowerCase() === c ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === c.replace(/[^a-z0-9]/g, "")
  );

  if (matched && matched.prefix) {
    return `${matched.prefix}${encodedTracking}`;
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

  // Fallback to direct web search for tracking
  return `https://www.google.com/search?q=${encodeURIComponent((rawCourier || "courier") + " tracking " + cleanTracking)}`;
}
