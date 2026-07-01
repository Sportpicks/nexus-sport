const FLAG_CODES: Record<string, string> = {
  // Spanish names
  "brasil": "br", "argentina": "ar", "francia": "fr", "alemania": "de",
  "españa": "es", "portugal": "pt", "inglaterra": "gb-eng", "uruguay": "uy",
  "colombia": "co", "méxico": "mx", "mexico": "mx", "estados unidos": "us",
  "usa": "us", "canadá": "ca", "canada": "ca", "marruecos": "ma",
  "japón": "jp", "japon": "jp", "croacia": "hr", "países bajos": "nl",
  "holanda": "nl", "suiza": "ch", "senegal": "sn", "australia": "au",
  "corea del sur": "kr", "italia": "it", "bélgica": "be", "belgica": "be",
  "polonia": "pl", "serbia": "rs", "dinamarca": "dk", "ecuador": "ec",
  "perú": "pe", "peru": "pe", "chile": "cl", "venezuela": "ve",
  "ghana": "gh", "nigeria": "ng", "turquía": "tr", "turquia": "tr",
  "ucrania": "ua", "austria": "at", "escocia": "gb-sct", "gales": "gb-wls",
  "grecia": "gr", "noruega": "no", "suecia": "se", "rumania": "ro",
  "hungría": "hu", "hungria": "hu", "irán": "ir", "iran": "ir",
  "arabia saudita": "sa", "costa de marfil": "ci", "congo": "cd",
  "bosnia": "ba", "bosnia-herzegovina": "ba", "nueva zelanda": "nz",
  "mali": "ml", "egipto": "eg", "argelia": "dz", "túnez": "tn", "tunez": "tn",
  "qatar": "qa", "panamá": "pa", "panama": "pa", "jamaica": "jm",
  "costa rica": "cr", "bolivia": "bo", "paraguay": "py",

  // English names
  "brazil": "br", "germany": "de", "france": "fr", "spain": "es",
  "england": "gb-eng", "netherlands": "nl", "croatia": "hr",
  "switzerland": "ch", "belgium": "be", "norway": "no", "sweden": "se",
  "south africa": "za", "japan": "jp", "south korea": "kr",
  "korea republic": "kr", "iran": "ir", "saudi arabia": "sa",
  "ivory coast": "ci", "congo dr": "cd", "mali": "ml", "egypt": "eg",
  "algeria": "dz", "tunisia": "tn", "morocco": "ma", "cameroon": "cm",
  "united states": "us", "bosnia-herzegovina": "ba", "new zealand": "nz",
  "turkey": "tr", "ukraine": "ua", "romania": "ro", "greece": "gr",
  "hungary": "hu", "denmark": "dk", "poland": "pl", "austria": "at",
  "serbia": "rs", "nigeria": "ng", "ghana": "gh", "ecuador": "ec",
  "colombia": "co", "uruguay": "uy", "argentina": "ar", "portugal": "pt",
  "mexico": "mx", "paraguay": "py", "venezuela": "ve", "chile": "cl",
  "peru": "pe", "bolivia": "bo", "costa rica": "cr", "panama": "pa",
  "jamaica": "jm", "senegal": "sn", "australia": "au", "qatar": "qa",
  "scotland": "gb-sct", "wales": "gb-wls", "italy": "it",
};

export function getFlagUrl(name: string): string {
  const code = FLAG_CODES[name.toLowerCase().trim()] ?? "un";
  return `https://flagcdn.com/w40/${code}.png`;
}

export function getFlag(name: string): string {
  switch (name.toLowerCase().trim()) {
    case "brasil": case "brazil":           return "🇧🇷";
    case "argentina":                        return "🇦🇷";
    case "francia": case "france":           return "🇫🇷";
    case "alemania": case "germany":         return "🇩🇪";
    case "españa": case "spain":             return "🇪🇸";
    case "portugal":                         return "🇵🇹";
    case "inglaterra": case "england":       return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    case "países bajos": case "holanda":
    case "netherlands":                      return "🇳🇱";
    case "uruguay":                          return "🇺🇾";
    case "colombia":                         return "🇨🇴";
    case "méxico": case "mexico":            return "🇲🇽";
    case "estados unidos": case "united states": case "usa": return "🇺🇸";
    case "canadá": case "canada":            return "🇨🇦";
    case "marruecos": case "morocco":        return "🇲🇦";
    case "senegal":                          return "🇸🇳";
    case "japón": case "japon": case "japan": return "🇯🇵";
    case "corea del sur": case "korea republic": return "🇰🇷";
    case "australia":                        return "🇦🇺";
    case "croacia": case "croatia":          return "🇭🇷";
    case "bélgica": case "belgica": case "belgium": return "🇧🇪";
    case "suiza": case "switzerland":        return "🇨🇭";
    case "italia": case "italy":             return "🇮🇹";
    case "polonia": case "poland":           return "🇵🇱";
    case "serbia":                           return "🇷🇸";
    case "dinamarca": case "denmark":        return "🇩🇰";
    case "ecuador":                          return "🇪🇨";
    case "perú": case "peru":               return "🇵🇪";
    case "chile":                            return "🇨🇱";
    case "venezuela":                        return "🇻🇪";
    case "ghana":                            return "🇬🇭";
    case "nigeria":                          return "🇳🇬";
    case "turquía": case "turquia": case "turkey": return "🇹🇷";
    case "ucrania": case "ukraine":          return "🇺🇦";
    case "austria":                          return "🇦🇹";
    case "escocia": case "scotland":         return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
    case "gales": case "wales":              return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
    case "grecia": case "greece":            return "🇬🇷";
    default:                                 return "🏳️";
  }
}
