// Shipping carriers the admin can pick when marking a pre-order shipped.
// `track` builds the public tracking page for a number; carriers without a
// stable deep link leave it out and the admin pastes the URL instead. The
// tracking URL field is always editable, so a wrong template is a one-off fix.
//
// Add a carrier here and it appears in the admin dropdown and is accepted by
// the API — the list is shared by both.

export interface Carrier {
  id: string;
  name: string;
  track?: (trackingNumber: string) => string;
}

const enc = encodeURIComponent;

export const CARRIERS: readonly Carrier[] = [
  { id: 'delhivery', name: 'Delhivery', track: (n) => `https://www.delhivery.com/track-v2/package/${enc(n)}` },
  {
    id: 'bluedart',
    name: 'Blue Dart',
    track: (n) => `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=${enc(n)}`,
  },
  { id: 'shiprocket', name: 'Shiprocket', track: (n) => `https://shiprocket.co/tracking/${enc(n)}` },
  { id: 'ekart', name: 'Ekart', track: (n) => `https://ekartlogistics.com/shipmenttrack/${enc(n)}` },
  { id: 'india-post', name: 'India Post' },
  { id: 'dtdc', name: 'DTDC' },
  { id: 'fedex', name: 'FedEx', track: (n) => `https://www.fedex.com/fedextrack/?trknbr=${enc(n)}` },
  {
    id: 'dhl',
    name: 'DHL Express',
    track: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${enc(n)}`,
  },
  { id: 'ups', name: 'UPS', track: (n) => `https://www.ups.com/track?tracknum=${enc(n)}` },
  { id: 'usps', name: 'USPS', track: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${enc(n)}` },
  { id: 'other', name: 'Other' },
];

export function findCarrier(id: string | null | undefined): Carrier | undefined {
  return CARRIERS.find((carrier) => carrier.id === id);
}

/** Display name for a stored carrier id; falls back to the raw value for old or unknown ids. */
export function carrierName(id: string | null | undefined): string {
  return findCarrier(id)?.name ?? id ?? '';
}
