/** Labels for commonly used provider subdivisions; unknown codes stay visible. */
const REGION_NAMES: Record<string, string> = {
  'GB-ENG': 'England', 'GB-WLS': 'Wales', 'GB-SCT': 'Scotland', 'GB-NIR': 'Northern Ireland',
  'AU-ACT': 'Australian Capital Territory', 'AU-NSW': 'New South Wales', 'AU-NT': 'Northern Territory',
  'AU-QLD': 'Queensland', 'AU-SA': 'South Australia', 'AU-TAS': 'Tasmania', 'AU-VIC': 'Victoria', 'AU-WA': 'Western Australia',
  'CA-AB': 'Alberta', 'CA-BC': 'British Columbia', 'CA-MB': 'Manitoba', 'CA-NB': 'New Brunswick',
  'CA-NL': 'Newfoundland and Labrador', 'CA-NS': 'Nova Scotia', 'CA-NT': 'Northwest Territories',
  'CA-NU': 'Nunavut', 'CA-ON': 'Ontario', 'CA-PE': 'Prince Edward Island', 'CA-QC': 'Quebec', 'CA-SK': 'Saskatchewan', 'CA-YT': 'Yukon',
  'US-AL': 'Alabama', 'US-AK': 'Alaska', 'US-AZ': 'Arizona', 'US-AR': 'Arkansas', 'US-CA': 'California',
  'US-CO': 'Colorado', 'US-CT': 'Connecticut', 'US-DE': 'Delaware', 'US-DC': 'District of Columbia',
  'US-FL': 'Florida', 'US-GA': 'Georgia', 'US-HI': 'Hawaii', 'US-ID': 'Idaho', 'US-IL': 'Illinois',
  'US-IN': 'Indiana', 'US-IA': 'Iowa', 'US-KS': 'Kansas', 'US-KY': 'Kentucky', 'US-LA': 'Louisiana',
  'US-ME': 'Maine', 'US-MD': 'Maryland', 'US-MA': 'Massachusetts', 'US-MI': 'Michigan', 'US-MN': 'Minnesota',
  'US-MS': 'Mississippi', 'US-MO': 'Missouri', 'US-MT': 'Montana', 'US-NE': 'Nebraska', 'US-NV': 'Nevada',
  'US-NH': 'New Hampshire', 'US-NJ': 'New Jersey', 'US-NM': 'New Mexico', 'US-NY': 'New York',
  'US-NC': 'North Carolina', 'US-ND': 'North Dakota', 'US-OH': 'Ohio', 'US-OK': 'Oklahoma', 'US-OR': 'Oregon',
  'US-PA': 'Pennsylvania', 'US-RI': 'Rhode Island', 'US-SC': 'South Carolina', 'US-SD': 'South Dakota',
  'US-TN': 'Tennessee', 'US-TX': 'Texas', 'US-UT': 'Utah', 'US-VT': 'Vermont', 'US-VA': 'Virginia',
  'US-WA': 'Washington', 'US-WV': 'West Virginia', 'US-WI': 'Wisconsin', 'US-WY': 'Wyoming',
};
export const getRegionLabel = (region: string): string => REGION_NAMES[region] ? `${REGION_NAMES[region]} (${region})` : region;
