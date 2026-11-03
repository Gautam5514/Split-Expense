// Nov–Dec getaways that are realistically "near you", keyed by state (the profile's
// optional city/state; we never use GPS or IP for this). Goa is the national favourite,
// so it appears as the aspirational pick unless the user already lives near it.
const REGIONS = [
  { states: ["odisha", "orissa"], cities: ["bhubaneswar", "cuttack", "rourkela"], near: ["Puri", "Konark", "Chilika"] },
  { states: ["west bengal"], cities: ["kolkata", "howrah", "siliguri", "durgapur"], near: ["Darjeeling", "Puri", "Sundarbans"] },
  { states: ["maharashtra"], cities: ["mumbai", "pune", "thane", "navi mumbai", "nashik", "nagpur"], near: ["Lonavala", "Alibaug", "Mahabaleshwar"] },
  { states: ["goa"], cities: ["panaji", "margao", "vasco"], near: ["Gokarna", "Hampi", "Coorg"], skipGoa: true },
  { states: ["delhi", "nct of delhi", "haryana"], cities: ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "faridabad", "ghaziabad"], near: ["Jaipur", "Rishikesh", "Manali"] },
  { states: ["uttar pradesh"], cities: ["lucknow", "kanpur", "varanasi", "agra", "prayagraj"], near: ["Varanasi", "Rishikesh", "Nainital"] },
  { states: ["uttarakhand"], cities: ["dehradun", "haridwar"], near: ["Mussoorie", "Rishikesh", "Auli"] },
  { states: ["punjab", "chandigarh", "himachal pradesh"], cities: ["chandigarh", "ludhiana", "amritsar", "mohali", "shimla"], near: ["Manali", "Kasol", "Dharamshala"] },
  { states: ["rajasthan"], cities: ["jaipur", "jodhpur", "udaipur", "kota"], near: ["Udaipur", "Jaisalmer", "Pushkar"] },
  { states: ["gujarat"], cities: ["ahmedabad", "surat", "vadodara", "rajkot"], near: ["Rann of Kutch", "Udaipur", "Diu"] },
  { states: ["madhya pradesh"], cities: ["bhopal", "indore", "gwalior", "jabalpur"], near: ["Pachmarhi", "Khajuraho", "Udaipur"] },
  { states: ["karnataka"], cities: ["bengaluru", "bangalore", "mysuru", "mysore", "mangaluru", "hubli"], near: ["Coorg", "Gokarna", "Chikmagalur"] },
  { states: ["tamil nadu", "puducherry", "pondicherry"], cities: ["chennai", "coimbatore", "madurai", "trichy"], near: ["Pondicherry", "Ooty", "Munnar"] },
  { states: ["kerala"], cities: ["kochi", "trivandrum", "thiruvananthapuram", "kozhikode"], near: ["Munnar", "Varkala", "Alleppey"] },
  { states: ["telangana", "andhra pradesh"], cities: ["hyderabad", "secunderabad", "vizag", "visakhapatnam", "vijayawada"], near: ["Hampi", "Araku Valley", "Gokarna"] },
  { states: ["bihar", "jharkhand"], cities: ["patna", "ranchi", "jamshedpur", "gaya"], near: ["Darjeeling", "Puri", "Bodh Gaya"] },
  { states: ["assam", "meghalaya", "nagaland", "manipur", "mizoram", "tripura", "arunachal pradesh", "sikkim"], cities: ["guwahati", "shillong", "gangtok", "kohima"], near: ["Shillong", "Kaziranga", "Hornbill Festival, Kohima"] },
  { states: ["jammu and kashmir", "ladakh"], cities: ["srinagar", "jammu", "leh"], near: ["Gulmarg", "Pahalgam", "Patnitop"] },
];
const FALLBACK = { near: [], skipGoa: false };

export function regionFor({ city, state } = {}) {
  const c = String(city || "").trim().toLowerCase();
  const s = String(state || "").trim().toLowerCase();
  return REGIONS.find(r => (s && r.states.includes(s)) || (c && r.cities.includes(c))) || FALLBACK;
}

// Which destinations a given trip nudge mentions. `step` walks through the list so
// each nudge in the season suggests somewhere new.
export function tripPick(profile, step = 1) {
  const r = regionFor(profile);
  const near = r.near.length ? r.near[(step - 1) % r.near.length] : null;
  const star = r.skipGoa ? r.near[step % r.near.length] : "Goa";
  return { near, star, personalised: Boolean(near) };
}
