// Address rules for the pre-order form. Imported by the checkout UI *and* by
// app/api/orders/route.ts, so the field the browser shows and the check the server runs
// are always the same rule — a postal code that passes on screen can't bounce
// at the API, and a hand-crafted request can't sneak past either.
//
// Country list: ISO 3166-1 alpha-2, with each country's international dial
// code. To stop shipping somewhere, remove it from SHIPS_TO below — the form's
// dropdown and the server both read that one list.

export interface Country {
  code: string;
  name: string;
  dial: string;
}

// prettier-ignore
const ALL_COUNTRIES: readonly Country[] = [
  { code: 'AF', name: 'Afghanistan', dial: '93' },
  { code: 'AX', name: 'Åland Islands', dial: '358' },
  { code: 'AL', name: 'Albania', dial: '355' },
  { code: 'DZ', name: 'Algeria', dial: '213' },
  { code: 'AS', name: 'American Samoa', dial: '1' },
  { code: 'AD', name: 'Andorra', dial: '376' },
  { code: 'AO', name: 'Angola', dial: '244' },
  { code: 'AI', name: 'Anguilla', dial: '1' },
  { code: 'AG', name: 'Antigua and Barbuda', dial: '1' },
  { code: 'AR', name: 'Argentina', dial: '54' },
  { code: 'AM', name: 'Armenia', dial: '374' },
  { code: 'AW', name: 'Aruba', dial: '297' },
  { code: 'AU', name: 'Australia', dial: '61' },
  { code: 'AT', name: 'Austria', dial: '43' },
  { code: 'AZ', name: 'Azerbaijan', dial: '994' },
  { code: 'BS', name: 'Bahamas', dial: '1' },
  { code: 'BH', name: 'Bahrain', dial: '973' },
  { code: 'BD', name: 'Bangladesh', dial: '880' },
  { code: 'BB', name: 'Barbados', dial: '1' },
  { code: 'BY', name: 'Belarus', dial: '375' },
  { code: 'BE', name: 'Belgium', dial: '32' },
  { code: 'BZ', name: 'Belize', dial: '501' },
  { code: 'BJ', name: 'Benin', dial: '229' },
  { code: 'BM', name: 'Bermuda', dial: '1' },
  { code: 'BT', name: 'Bhutan', dial: '975' },
  { code: 'BO', name: 'Bolivia', dial: '591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial: '387' },
  { code: 'BW', name: 'Botswana', dial: '267' },
  { code: 'BR', name: 'Brazil', dial: '55' },
  { code: 'IO', name: 'British Indian Ocean Territory', dial: '246' },
  { code: 'VG', name: 'British Virgin Islands', dial: '1' },
  { code: 'BN', name: 'Brunei', dial: '673' },
  { code: 'BG', name: 'Bulgaria', dial: '359' },
  { code: 'BF', name: 'Burkina Faso', dial: '226' },
  { code: 'BI', name: 'Burundi', dial: '257' },
  { code: 'KH', name: 'Cambodia', dial: '855' },
  { code: 'CM', name: 'Cameroon', dial: '237' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'CV', name: 'Cape Verde', dial: '238' },
  { code: 'BQ', name: 'Caribbean Netherlands', dial: '599' },
  { code: 'KY', name: 'Cayman Islands', dial: '1' },
  { code: 'CF', name: 'Central African Republic', dial: '236' },
  { code: 'TD', name: 'Chad', dial: '235' },
  { code: 'CL', name: 'Chile', dial: '56' },
  { code: 'CN', name: 'China', dial: '86' },
  { code: 'CX', name: 'Christmas Island', dial: '61' },
  { code: 'CC', name: 'Cocos (Keeling) Islands', dial: '61' },
  { code: 'CO', name: 'Colombia', dial: '57' },
  { code: 'KM', name: 'Comoros', dial: '269' },
  { code: 'CG', name: 'Congo', dial: '242' },
  { code: 'CD', name: 'Congo (DRC)', dial: '243' },
  { code: 'CK', name: 'Cook Islands', dial: '682' },
  { code: 'CR', name: 'Costa Rica', dial: '506' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '225' },
  { code: 'HR', name: 'Croatia', dial: '385' },
  { code: 'CU', name: 'Cuba', dial: '53' },
  { code: 'CW', name: 'Curaçao', dial: '599' },
  { code: 'CY', name: 'Cyprus', dial: '357' },
  { code: 'CZ', name: 'Czechia', dial: '420' },
  { code: 'DK', name: 'Denmark', dial: '45' },
  { code: 'DJ', name: 'Djibouti', dial: '253' },
  { code: 'DM', name: 'Dominica', dial: '1' },
  { code: 'DO', name: 'Dominican Republic', dial: '1' },
  { code: 'EC', name: 'Ecuador', dial: '593' },
  { code: 'EG', name: 'Egypt', dial: '20' },
  { code: 'SV', name: 'El Salvador', dial: '503' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '240' },
  { code: 'ER', name: 'Eritrea', dial: '291' },
  { code: 'EE', name: 'Estonia', dial: '372' },
  { code: 'SZ', name: 'Eswatini', dial: '268' },
  { code: 'ET', name: 'Ethiopia', dial: '251' },
  { code: 'FK', name: 'Falkland Islands', dial: '500' },
  { code: 'FO', name: 'Faroe Islands', dial: '298' },
  { code: 'FJ', name: 'Fiji', dial: '679' },
  { code: 'FI', name: 'Finland', dial: '358' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'GF', name: 'French Guiana', dial: '594' },
  { code: 'PF', name: 'French Polynesia', dial: '689' },
  { code: 'GA', name: 'Gabon', dial: '241' },
  { code: 'GM', name: 'Gambia', dial: '220' },
  { code: 'GE', name: 'Georgia', dial: '995' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'GI', name: 'Gibraltar', dial: '350' },
  { code: 'GR', name: 'Greece', dial: '30' },
  { code: 'GL', name: 'Greenland', dial: '299' },
  { code: 'GD', name: 'Grenada', dial: '1' },
  { code: 'GP', name: 'Guadeloupe', dial: '590' },
  { code: 'GU', name: 'Guam', dial: '1' },
  { code: 'GT', name: 'Guatemala', dial: '502' },
  { code: 'GG', name: 'Guernsey', dial: '44' },
  { code: 'GN', name: 'Guinea', dial: '224' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '245' },
  { code: 'GY', name: 'Guyana', dial: '592' },
  { code: 'HT', name: 'Haiti', dial: '509' },
  { code: 'HN', name: 'Honduras', dial: '504' },
  { code: 'HK', name: 'Hong Kong', dial: '852' },
  { code: 'HU', name: 'Hungary', dial: '36' },
  { code: 'IS', name: 'Iceland', dial: '354' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'ID', name: 'Indonesia', dial: '62' },
  { code: 'IR', name: 'Iran', dial: '98' },
  { code: 'IQ', name: 'Iraq', dial: '964' },
  { code: 'IE', name: 'Ireland', dial: '353' },
  { code: 'IM', name: 'Isle of Man', dial: '44' },
  { code: 'IL', name: 'Israel', dial: '972' },
  { code: 'IT', name: 'Italy', dial: '39' },
  { code: 'JM', name: 'Jamaica', dial: '1' },
  { code: 'JP', name: 'Japan', dial: '81' },
  { code: 'JE', name: 'Jersey', dial: '44' },
  { code: 'JO', name: 'Jordan', dial: '962' },
  { code: 'KZ', name: 'Kazakhstan', dial: '7' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'KI', name: 'Kiribati', dial: '686' },
  { code: 'XK', name: 'Kosovo', dial: '383' },
  { code: 'KW', name: 'Kuwait', dial: '965' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '996' },
  { code: 'LA', name: 'Laos', dial: '856' },
  { code: 'LV', name: 'Latvia', dial: '371' },
  { code: 'LB', name: 'Lebanon', dial: '961' },
  { code: 'LS', name: 'Lesotho', dial: '266' },
  { code: 'LR', name: 'Liberia', dial: '231' },
  { code: 'LY', name: 'Libya', dial: '218' },
  { code: 'LI', name: 'Liechtenstein', dial: '423' },
  { code: 'LT', name: 'Lithuania', dial: '370' },
  { code: 'LU', name: 'Luxembourg', dial: '352' },
  { code: 'MO', name: 'Macao', dial: '853' },
  { code: 'MG', name: 'Madagascar', dial: '261' },
  { code: 'MW', name: 'Malawi', dial: '265' },
  { code: 'MY', name: 'Malaysia', dial: '60' },
  { code: 'MV', name: 'Maldives', dial: '960' },
  { code: 'ML', name: 'Mali', dial: '223' },
  { code: 'MT', name: 'Malta', dial: '356' },
  { code: 'MH', name: 'Marshall Islands', dial: '692' },
  { code: 'MQ', name: 'Martinique', dial: '596' },
  { code: 'MR', name: 'Mauritania', dial: '222' },
  { code: 'MU', name: 'Mauritius', dial: '230' },
  { code: 'YT', name: 'Mayotte', dial: '262' },
  { code: 'MX', name: 'Mexico', dial: '52' },
  { code: 'FM', name: 'Micronesia', dial: '691' },
  { code: 'MD', name: 'Moldova', dial: '373' },
  { code: 'MC', name: 'Monaco', dial: '377' },
  { code: 'MN', name: 'Mongolia', dial: '976' },
  { code: 'ME', name: 'Montenegro', dial: '382' },
  { code: 'MS', name: 'Montserrat', dial: '1' },
  { code: 'MA', name: 'Morocco', dial: '212' },
  { code: 'MZ', name: 'Mozambique', dial: '258' },
  { code: 'MM', name: 'Myanmar', dial: '95' },
  { code: 'NA', name: 'Namibia', dial: '264' },
  { code: 'NR', name: 'Nauru', dial: '674' },
  { code: 'NP', name: 'Nepal', dial: '977' },
  { code: 'NL', name: 'Netherlands', dial: '31' },
  { code: 'NC', name: 'New Caledonia', dial: '687' },
  { code: 'NZ', name: 'New Zealand', dial: '64' },
  { code: 'NI', name: 'Nicaragua', dial: '505' },
  { code: 'NE', name: 'Niger', dial: '227' },
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'NU', name: 'Niue', dial: '683' },
  { code: 'NF', name: 'Norfolk Island', dial: '672' },
  { code: 'KP', name: 'North Korea', dial: '850' },
  { code: 'MK', name: 'North Macedonia', dial: '389' },
  { code: 'MP', name: 'Northern Mariana Islands', dial: '1' },
  { code: 'NO', name: 'Norway', dial: '47' },
  { code: 'OM', name: 'Oman', dial: '968' },
  { code: 'PK', name: 'Pakistan', dial: '92' },
  { code: 'PW', name: 'Palau', dial: '680' },
  { code: 'PS', name: 'Palestine', dial: '970' },
  { code: 'PA', name: 'Panama', dial: '507' },
  { code: 'PG', name: 'Papua New Guinea', dial: '675' },
  { code: 'PY', name: 'Paraguay', dial: '595' },
  { code: 'PE', name: 'Peru', dial: '51' },
  { code: 'PH', name: 'Philippines', dial: '63' },
  { code: 'PN', name: 'Pitcairn Islands', dial: '64' },
  { code: 'PL', name: 'Poland', dial: '48' },
  { code: 'PT', name: 'Portugal', dial: '351' },
  { code: 'PR', name: 'Puerto Rico', dial: '1' },
  { code: 'QA', name: 'Qatar', dial: '974' },
  { code: 'RE', name: 'Réunion', dial: '262' },
  { code: 'RO', name: 'Romania', dial: '40' },
  { code: 'RU', name: 'Russia', dial: '7' },
  { code: 'RW', name: 'Rwanda', dial: '250' },
  { code: 'WS', name: 'Samoa', dial: '685' },
  { code: 'SM', name: 'San Marino', dial: '378' },
  { code: 'ST', name: 'São Tomé and Príncipe', dial: '239' },
  { code: 'SA', name: 'Saudi Arabia', dial: '966' },
  { code: 'SN', name: 'Senegal', dial: '221' },
  { code: 'RS', name: 'Serbia', dial: '381' },
  { code: 'SC', name: 'Seychelles', dial: '248' },
  { code: 'SL', name: 'Sierra Leone', dial: '232' },
  { code: 'SG', name: 'Singapore', dial: '65' },
  { code: 'SX', name: 'Sint Maarten', dial: '1' },
  { code: 'SK', name: 'Slovakia', dial: '421' },
  { code: 'SI', name: 'Slovenia', dial: '386' },
  { code: 'SB', name: 'Solomon Islands', dial: '677' },
  { code: 'SO', name: 'Somalia', dial: '252' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'KR', name: 'South Korea', dial: '82' },
  { code: 'SS', name: 'South Sudan', dial: '211' },
  { code: 'ES', name: 'Spain', dial: '34' },
  { code: 'LK', name: 'Sri Lanka', dial: '94' },
  { code: 'BL', name: 'St. Barthélemy', dial: '590' },
  { code: 'SH', name: 'St. Helena', dial: '290' },
  { code: 'KN', name: 'St. Kitts and Nevis', dial: '1' },
  { code: 'LC', name: 'St. Lucia', dial: '1' },
  { code: 'MF', name: 'St. Martin', dial: '590' },
  { code: 'PM', name: 'St. Pierre and Miquelon', dial: '508' },
  { code: 'VC', name: 'St. Vincent and the Grenadines', dial: '1' },
  { code: 'SD', name: 'Sudan', dial: '249' },
  { code: 'SR', name: 'Suriname', dial: '597' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', dial: '47' },
  { code: 'SE', name: 'Sweden', dial: '46' },
  { code: 'CH', name: 'Switzerland', dial: '41' },
  { code: 'SY', name: 'Syria', dial: '963' },
  { code: 'TW', name: 'Taiwan', dial: '886' },
  { code: 'TJ', name: 'Tajikistan', dial: '992' },
  { code: 'TZ', name: 'Tanzania', dial: '255' },
  { code: 'TH', name: 'Thailand', dial: '66' },
  { code: 'TL', name: 'Timor-Leste', dial: '670' },
  { code: 'TG', name: 'Togo', dial: '228' },
  { code: 'TK', name: 'Tokelau', dial: '690' },
  { code: 'TO', name: 'Tonga', dial: '676' },
  { code: 'TT', name: 'Trinidad and Tobago', dial: '1' },
  { code: 'TN', name: 'Tunisia', dial: '216' },
  { code: 'TR', name: 'Türkiye', dial: '90' },
  { code: 'TM', name: 'Turkmenistan', dial: '993' },
  { code: 'TC', name: 'Turks and Caicos Islands', dial: '1' },
  { code: 'TV', name: 'Tuvalu', dial: '688' },
  { code: 'VI', name: 'U.S. Virgin Islands', dial: '1' },
  { code: 'UG', name: 'Uganda', dial: '256' },
  { code: 'UA', name: 'Ukraine', dial: '380' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'UY', name: 'Uruguay', dial: '598' },
  { code: 'UZ', name: 'Uzbekistan', dial: '998' },
  { code: 'VU', name: 'Vanuatu', dial: '678' },
  { code: 'VA', name: 'Vatican City', dial: '39' },
  { code: 'VE', name: 'Venezuela', dial: '58' },
  { code: 'VN', name: 'Vietnam', dial: '84' },
  { code: 'WF', name: 'Wallis and Futuna', dial: '681' },
  { code: 'EH', name: 'Western Sahara', dial: '212' },
  { code: 'YE', name: 'Yemen', dial: '967' },
  { code: 'ZM', name: 'Zambia', dial: '260' },
  { code: 'ZW', name: 'Zimbabwe', dial: '263' },
];

/** Where pre-orders can ship. Narrow this to restrict the form and the API at once. */
export const SHIPS_TO: readonly Country[] = ALL_COUNTRIES;

const BY_CODE = new Map(ALL_COUNTRIES.map((country) => [country.code, country]));

export function findCountry(code: string | undefined | null): Country | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function shipsTo(code: string): boolean {
  return SHIPS_TO.some((country) => country.code === code);
}

/** Regional-indicator emoji for an ISO code ("IN" → 🇮🇳). */
export function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)));
}

// ---------------------------------------------------------------------------
// Regions: countries whose postal system expects a state/province from a fixed
// list get a dropdown and a required value. Everywhere else the field is a
// free-text, optional "region".
// ---------------------------------------------------------------------------

export interface Region {
  code: string;
  name: string;
}

const r = (pairs: string): Region[] =>
  pairs.split('|').map((pair) => {
    const [code, name] = pair.split(':');
    return { code, name };
  });

// prettier-ignore
const REGIONS: Record<string, Region[]> = {
  US: r('AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|AA:Armed Forces Americas|AE:Armed Forces Europe|AP:Armed Forces Pacific'),
  CA: r('AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|NT:Northwest Territories|NS:Nova Scotia|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|QC:Quebec|SK:Saskatchewan|YT:Yukon'),
  AU: r('ACT:Australian Capital Territory|NSW:New South Wales|NT:Northern Territory|QLD:Queensland|SA:South Australia|TAS:Tasmania|VIC:Victoria|WA:Western Australia'),
  IN: r('AN:Andaman and Nicobar Islands|AP:Andhra Pradesh|AR:Arunachal Pradesh|AS:Assam|BR:Bihar|CH:Chandigarh|CT:Chhattisgarh|DH:Dadra and Nagar Haveli and Daman and Diu|DL:Delhi|GA:Goa|GJ:Gujarat|HR:Haryana|HP:Himachal Pradesh|JK:Jammu and Kashmir|JH:Jharkhand|KA:Karnataka|KL:Kerala|LA:Ladakh|LD:Lakshadweep|MP:Madhya Pradesh|MH:Maharashtra|MN:Manipur|ML:Meghalaya|MZ:Mizoram|NL:Nagaland|OR:Odisha|PY:Puducherry|PB:Punjab|RJ:Rajasthan|SK:Sikkim|TN:Tamil Nadu|TG:Telangana|TR:Tripura|UP:Uttar Pradesh|UT:Uttarakhand|WB:West Bengal'),
  MX: r('AGU:Aguascalientes|BCN:Baja California|BCS:Baja California Sur|CAM:Campeche|CHP:Chiapas|CHH:Chihuahua|CMX:Ciudad de México|COA:Coahuila|COL:Colima|DUR:Durango|GUA:Guanajuato|GRO:Guerrero|HID:Hidalgo|JAL:Jalisco|MEX:Estado de México|MIC:Michoacán|MOR:Morelos|NAY:Nayarit|NLE:Nuevo León|OAX:Oaxaca|PUE:Puebla|QUE:Querétaro|ROO:Quintana Roo|SLP:San Luis Potosí|SIN:Sinaloa|SON:Sonora|TAB:Tabasco|TAM:Tamaulipas|TLA:Tlaxcala|VER:Veracruz|YUC:Yucatán|ZAC:Zacatecas'),
  BR: r('AC:Acre|AL:Alagoas|AP:Amapá|AM:Amazonas|BA:Bahia|CE:Ceará|DF:Distrito Federal|ES:Espírito Santo|GO:Goiás|MA:Maranhão|MT:Mato Grosso|MS:Mato Grosso do Sul|MG:Minas Gerais|PA:Pará|PB:Paraíba|PR:Paraná|PE:Pernambuco|PI:Piauí|RJ:Rio de Janeiro|RN:Rio Grande do Norte|RS:Rio Grande do Sul|RO:Rondônia|RR:Roraima|SC:Santa Catarina|SP:São Paulo|SE:Sergipe|TO:Tocantins'),
};

export function regionsFor(countryCode: string): Region[] | undefined {
  return REGIONS[countryCode];
}

// ---------------------------------------------------------------------------
// Per-country field labels and postal formats. Patterns are deliberately the
// shape of a real code, not a lookup — they catch typos and transpositions,
// not whether the street exists.
// ---------------------------------------------------------------------------

export interface AddressFormat {
  regionLabel: string;
  postalLabel: string;
  postalPlaceholder?: string;
  cityLabel: string;
  /** Undefined → any 2–10 letters/digits/spaces/hyphens. */
  postalPattern?: RegExp;
  /** The country has no postal codes in common use; the field is optional. */
  postalOptional?: boolean;
  /** Normalise before validating/storing, e.g. uppercase and single spaces. */
  postalUppercase?: boolean;
}

const DEFAULT_FORMAT: AddressFormat = {
  regionLabel: 'State or region',
  postalLabel: 'Postal code',
  cityLabel: 'City',
};

// prettier-ignore
const FORMATS: Record<string, Partial<AddressFormat>> = {
  US: { regionLabel: 'State', postalLabel: 'ZIP code', postalPlaceholder: '94103', postalPattern: /^\d{5}(-\d{4})?$/ },
  CA: { regionLabel: 'Province', postalPlaceholder: 'M5V 2T6', postalPattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/, postalUppercase: true },
  GB: { regionLabel: 'County', postalLabel: 'Postcode', cityLabel: 'Town or city', postalPlaceholder: 'SW1A 1AA', postalPattern: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/, postalUppercase: true },
  IE: { regionLabel: 'County', postalLabel: 'Eircode', cityLabel: 'Town or city', postalPlaceholder: 'D02 X285', postalPattern: /^([AC-FHKNPRTV-Y]\d{2}|D6W) ?[0-9AC-FHKNPRTV-Y]{4}$/, postalUppercase: true, postalOptional: true },
  IN: { regionLabel: 'State', postalLabel: 'PIN code', postalPlaceholder: '110001', postalPattern: /^[1-9]\d{5}$/ },
  AU: { regionLabel: 'State or territory', postalLabel: 'Postcode', cityLabel: 'Suburb', postalPlaceholder: '2000', postalPattern: /^\d{4}$/ },
  NZ: { regionLabel: 'Region', postalLabel: 'Postcode', postalPattern: /^\d{4}$/ },
  DE: { regionLabel: 'State', postalLabel: 'Postleitzahl', postalPattern: /^\d{5}$/ },
  FR: { regionLabel: 'Region', postalPattern: /^\d{5}$/ },
  IT: { regionLabel: 'Province', postalLabel: 'CAP', postalPattern: /^\d{5}$/ },
  ES: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  NL: { regionLabel: 'Province', postalLabel: 'Postcode', postalPlaceholder: '1012 AB', postalPattern: /^\d{4} ?[A-Z]{2}$/, postalUppercase: true },
  BE: { regionLabel: 'Province', postalPattern: /^\d{4}$/ },
  CH: { regionLabel: 'Canton', postalPattern: /^\d{4}$/ },
  AT: { regionLabel: 'State', postalPattern: /^\d{4}$/ },
  DK: { postalPattern: /^\d{4}$/ },
  NO: { postalPattern: /^\d{4}$/ },
  SE: { postalPattern: /^\d{3} ?\d{2}$/ },
  FI: { postalPattern: /^\d{5}$/ },
  PL: { regionLabel: 'Voivodeship', postalPattern: /^\d{2}-\d{3}$/ },
  PT: { regionLabel: 'District', postalPattern: /^\d{4}-\d{3}$/ },
  CZ: { postalPattern: /^\d{3} ?\d{2}$/ },
  JP: { regionLabel: 'Prefecture', postalPlaceholder: '100-0001', postalPattern: /^\d{3}-?\d{4}$/ },
  KR: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  CN: { regionLabel: 'Province', postalPattern: /^\d{6}$/ },
  SG: { postalPattern: /^\d{6}$/ },
  MY: { regionLabel: 'State', postalPattern: /^\d{5}$/ },
  BR: { regionLabel: 'State', postalLabel: 'CEP', postalPlaceholder: '01310-100', postalPattern: /^\d{5}-?\d{3}$/ },
  MX: { regionLabel: 'State', postalPattern: /^\d{5}$/ },
  ZA: { regionLabel: 'Province', postalPattern: /^\d{4}$/ },
  PK: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  BD: { regionLabel: 'Division', postalPattern: /^\d{4}$/ },
  LK: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  NP: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  RU: { regionLabel: 'Region', postalPattern: /^\d{6}$/ },
  TR: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  IL: { regionLabel: 'District', postalPattern: /^\d{7}$/ },
  SA: { regionLabel: 'Province', postalPattern: /^\d{5}(-\d{4})?$/ },
  PH: { regionLabel: 'Province', postalPattern: /^\d{4}$/ },
  TH: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  ID: { regionLabel: 'Province', postalPattern: /^\d{5}$/ },
  VN: { regionLabel: 'Province', postalPattern: /^\d{6}$/ },
  TW: { postalPattern: /^\d{3}(\d{2,3})?$/ },
};

// Countries with no postal codes in everyday use: the field becomes optional.
const NO_POSTAL = new Set(
  'AE AG AO AW BF BI BJ BO BS BW BZ CD CF CG CI CK CM DJ DM ER FJ GA GD GH GM GN GQ GY HK JM KI KM KN KP LC ML MO MR MW NR NU QA RW SB SC SL SO SR SS ST SY TD TF TG TK TL TO TT TV UG VU YE ZW'.split(
    ' ',
  ),
);

export function addressFormat(countryCode: string): AddressFormat {
  return {
    ...DEFAULT_FORMAT,
    ...FORMATS[countryCode],
    ...(NO_POSTAL.has(countryCode) ? { postalOptional: true } : null),
  };
}

// Where the space goes in a code typed without one: "M5V2T6" → "M5V 2T6".
// Counted from the end, so it holds for every length the format allows.
const SPACE_BEFORE_LAST: Record<string, number> = { CA: 3, GB: 3, IE: 4, NL: 2 };

export function normalizePostal(countryCode: string, value: string): string {
  let out = value.trim().replace(/\s+/g, ' ');
  if (addressFormat(countryCode).postalUppercase) out = out.toUpperCase();
  const split = SPACE_BEFORE_LAST[countryCode];
  if (split && !out.includes(' ') && out.length > split + 1) out = `${out.slice(0, -split)} ${out.slice(-split)}`;
  return out;
}

/** The postal label as it reads mid-sentence: "postal code", but "ZIP code" and "PIN code" keep their caps. */
export function postalNoun(countryCode: string): string {
  const label = addressFormat(countryCode).postalLabel;
  return /^Post(al code|code)$/.test(label) ? label.toLowerCase() : label;
}

const GENERIC_POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;

/** True when `value` (already normalised) is a plausible postal code for the country. */
export function isValidPostal(countryCode: string, value: string): boolean {
  const format = addressFormat(countryCode);
  if (!value) return Boolean(format.postalOptional);
  return (format.postalPattern ?? GENERIC_POSTAL).test(value);
}

// ---------------------------------------------------------------------------
// Phone: stored as E.164 ("+919876543210"). Without a full numbering-plan
// library we check the shape — national number length per ITU-T E.164 (max 15
// digits total) — and the exact length for the markets most likely to order.
// ---------------------------------------------------------------------------

// prettier-ignore
const NATIONAL_LENGTH: Record<string, [min: number, max: number]> = {
  US: [10, 10], CA: [10, 10], IN: [10, 10], GB: [10, 10], AU: [9, 9], NZ: [8, 10],
  DE: [6, 13], FR: [9, 9], IT: [6, 11], ES: [9, 9], NL: [9, 9], IE: [7, 9],
  SG: [8, 8], AE: [8, 9], JP: [9, 10], CN: [11, 11], BR: [10, 11], MX: [10, 10],
  PK: [10, 10], BD: [10, 10], LK: [9, 9], NP: [10, 10], ZA: [9, 9], SA: [9, 9],
};

/** Digits only, with a leading trunk "0" dropped (UK 07…, IN 09…, AU 04…). */
export function nationalDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

/** Returns the E.164 form, or null if the number doesn't fit the country's plan. */
export function toE164(countryCode: string, national: string): string | null {
  const country = findCountry(countryCode);
  if (!country) return null;
  const digits = nationalDigits(national);
  const [min, max] = NATIONAL_LENGTH[countryCode] ?? [4, 14];
  if (digits.length < min || digits.length > max) return null;
  if (country.dial.length + digits.length > 15) return null;
  // NANP numbers: area code and exchange can't start with 0 or 1.
  if (country.dial === '1' && !/^[2-9]\d{2}[2-9]/.test(digits)) return null;
  // Indian mobiles start 6–9; landlines need an STD code we can't verify here.
  if (countryCode === 'IN' && !/^[6-9]/.test(digits)) return null;
  return `+${country.dial}${digits}`;
}

// Several countries share a dial code; a bare "+44" most likely means the UK.
const PRIMARY_FOR_DIAL: Record<string, string> = {
  '1': 'US', '7': 'RU', '39': 'IT', '44': 'GB', '47': 'NO', '61': 'AU', '64': 'NZ',
  '212': 'MA', '262': 'RE', '358': 'FI', '590': 'GP', '599': 'CW',
};

/**
 * A pasted or autofilled "+44 7700 900123" carries its own country. Match the
 * longest dial code, preferring `preferred` when several countries share it (+1, +44).
 */
export function splitInternational(
  value: string,
  preferred: string,
): { countryCode: string; national: string } | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) return null;
  const digits = trimmed.replace(/\D/g, '').replace(/^00/, '');
  for (let length = 4; length >= 1; length--) {
    const dial = digits.slice(0, length);
    const matches = SHIPS_TO.filter((country) => country.dial === dial);
    if (matches.length === 0) continue;
    const pick =
      matches.find((country) => country.code === preferred) ??
      matches.find((country) => country.code === PRIMARY_FOR_DIAL[dial]) ??
      matches[0];
    return { countryCode: pick.code, national: digits.slice(length) };
  }
  return null;
}

/** "+1", "US" → nicely grouped national digits for display while typing. */
export function formatNational(countryCode: string, digits: string): string {
  const d = digits.slice(0, 15);
  if (findCountry(countryCode)?.dial === '1') {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }
  if (countryCode === 'IN' && d.length > 5) return `${d.slice(0, 5)} ${d.slice(5, 10)}`;
  // Generic: groups of 3–4 read well in most plans.
  return d.replace(/(\d{3,4})(?=\d{3})/g, '$1 ').trim();
}
