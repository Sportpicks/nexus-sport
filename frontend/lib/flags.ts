const FLAG_CODES: Record<string, string> = {
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
  "grecia": "gr",
};

export function getFlagUrl(name: string): string {
  const code = FLAG_CODES[name.toLowerCase().trim()] ?? "un";
  return `https://flagcdn.com/w80/${code}.png`;
}

export function getFlag(name: string): string {
  switch (name.toLowerCase().trim()) {
    case "brasil":           return "🇧🇷";
    case "argentina":        return "🇦🇷";
    case "francia":          return "🇫🇷";
    case "alemania":         return "🇩🇪";
    case "españa":     return "🇪🇸";
    case "portugal":         return "🇵🇹";
    case "inglaterra":       return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    case "países bajos":
    case "holanda":          return "🇳🇱";
    case "uruguay":          return "🇺🇾";
    case "colombia":         return "🇨🇴";
    case "méxico":
    case "mexico":           return "🇲🇽";
    case "estados unidos":
    case "usa":              return "🇺🇸";
    case "canadá":
    case "canada":           return "🇨🇦";
    case "marruecos":        return "🇲🇦";
    case "senegal":          return "🇸🇳";
    case "japón":
    case "japon":            return "🇯🇵";
    case "corea del sur":    return "🇰🇷";
    case "australia":        return "🇦🇺";
    case "croacia":          return "🇭🇷";
    case "bélgica":
    case "belgica":          return "🇧🇪";
    case "suiza":            return "🇨🇭";
    case "italia":           return "🇮🇹";
    case "polonia":          return "🇵🇱";
    case "serbia":           return "🇷🇸";
    case "dinamarca":        return "🇩🇰";
    case "ecuador":          return "🇪🇨";
    case "perú":
    case "peru":             return "🇵🇪";
    case "chile":            return "🇨🇱";
    case "venezuela":        return "🇻🇪";
    case "ghana":            return "🇬🇭";
    case "nigeria":          return "🇳🇬";
    case "turquía":
    case "turquia":          return "🇹🇷";
    case "ucrania":          return "🇺🇦";
    case "austria":          return "🇦🇹";
    case "escocia":          return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
    case "gales":            return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
    case "grecia":           return "🇬🇷";
    default:                 return "🏳️";
  }
}

