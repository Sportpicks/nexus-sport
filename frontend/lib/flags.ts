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

