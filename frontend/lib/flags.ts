// Maps team names (English & Spanish) to ISO 3166-1 alpha-2 codes for flagcdn.com
const FLAG_MAP: Record<string, string> = {
  // English names (from football-data.org API)
  'argentina': 'ar',       'brazil': 'br',          'mexico': 'mx',
  'united states': 'us',   'canada': 'ca',           'colombia': 'co',
  'uruguay': 'uy',         'ecuador': 'ec',          'peru': 'pe',
  'chile': 'cl',           'venezuela': 've',        'bolivia': 'bo',
  'paraguay': 'py',        'costa rica': 'cr',       'panama': 'pa',
  'jamaica': 'jm',         'honduras': 'hn',         'el salvador': 'sv',
  'haiti': 'ht',           'trinidad and tobago': 'tt', 'cuba': 'cu',
  'guatemala': 'gt',
  'france': 'fr',          'germany': 'de',          'spain': 'es',
  'portugal': 'pt',        'england': 'gb-eng',      'netherlands': 'nl',
  'belgium': 'be',         'italy': 'it',            'croatia': 'hr',
  'switzerland': 'ch',     'denmark': 'dk',          'sweden': 'se',
  'norway': 'no',          'poland': 'pl',           'serbia': 'rs',
  'ukraine': 'ua',         'austria': 'at',          'hungary': 'hu',
  'turkey': 'tr',          'romania': 'ro',          'greece': 'gr',
  'czech republic': 'cz',  'slovakia': 'sk',         'slovenia': 'si',
  'scotland': 'gb-sct',    'wales': 'gb-wls',        'albania': 'al',
  'georgia': 'ge',         'bosnia-herzegovina': 'ba', 'north macedonia': 'mk',
  'iceland': 'is',         'finland': 'fi',          'russia': 'ru',
  'bulgaria': 'bg',        'ireland': 'ie',
  'morocco': 'ma',         'senegal': 'sn',          'ghana': 'gh',
  'nigeria': 'ng',         'cameroon': 'cm',         'ivory coast': 'ci',
  'mali': 'ml',            'egypt': 'eg',            'algeria': 'dz',
  'tunisia': 'tn',         'south africa': 'za',     'congo dr': 'cd',
  'democratic republic of congo': 'cd', 'kenya': 'ke', 'tanzania': 'tz',
  'japan': 'jp',           'korea republic': 'kr',   'south korea': 'kr',
  'australia': 'au',       'iran': 'ir',             'saudi arabia': 'sa',
  'qatar': 'qa',           'china': 'cn',            'new zealand': 'nz',
  'indonesia': 'id',       'vietnam': 'vn',          'thailand': 'th',

  // Spanish aliases
  'brasil': 'br',          'alemania': 'de',         'españa': 'es',
  'francia': 'fr',         'holanda': 'nl',          'países bajos': 'nl',
  'marruecos': 'ma',       'japón': 'jp',            'japon': 'jp',
  'corea del sur': 'kr',   'croacia': 'hr',          'suiza': 'ch',
  'bélgica': 'be',         'belgica': 'be',          'polonia': 'pl',
  'dinamarca': 'dk',       'suecia': 'se',           'noruega': 'no',
  'turquía': 'tr',         'turquia': 'tr',          'ucrania': 'ua',
  'hungría': 'hu',         'hungria': 'hu',          'rumania': 'ro',
  'grecia': 'gr',          'escocia': 'gb-sct',      'gales': 'gb-wls',
  'irlanda': 'ie',         'islandia': 'is',         'finlandia': 'fi',
  'camerún': 'cm',         'camerun': 'cm',          'costa de marfil': 'ci',
  'egipto': 'eg',          'argelia': 'dz',          'túnez': 'tn',
  'tunez': 'tn',           'arabia saudita': 'sa',   'irán': 'ir',
  'nueva zelanda': 'nz',   'estados unidos': 'us',   'canadá': 'ca',
  'panamá': 'pa',          'perú': 'pe',             'sudáfrica': 'za',
  'sudafrica': 'za',       'kenia': 'ke',            'italia': 'it',
  'eslovenia': 'si',       'eslovaquia': 'sk',       'república checa': 'cz',
  'macedonia del norte': 'mk', 'bosnia': 'ba',       'tailandia': 'th',
};

export function getFlagUrl(name: string): string {
  if (!name) return 'https://flagcdn.com/w40/un.png';
  const key = name.toLowerCase().trim();
  const code = FLAG_MAP[key] ?? null;
  if (!code) {
    console.warn('Flag not found for:', name);
    return 'https://flagcdn.com/w40/un.png';
  }
  return `https://flagcdn.com/w40/${code}.png`;
}

export function getFlag(name: string): string {
  switch (name.toLowerCase().trim()) {
    case 'brasil': case 'brazil':                    return '🇧🇷';
    case 'argentina':                                return '🇦🇷';
    case 'francia': case 'france':                   return '🇫🇷';
    case 'alemania': case 'germany':                 return '🇩🇪';
    case 'españa': case 'spain':                     return '🇪🇸';
    case 'portugal':                                 return '🇵🇹';
    case 'inglaterra': case 'england':               return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    case 'países bajos': case 'holanda':
    case 'netherlands':                              return '🇳🇱';
    case 'uruguay':                                  return '🇺🇾';
    case 'colombia':                                 return '🇨🇴';
    case 'méxico': case 'mexico':                    return '🇲🇽';
    case 'estados unidos': case 'united states':
    case 'usa':                                      return '🇺🇸';
    case 'canadá': case 'canada':                    return '🇨🇦';
    case 'marruecos': case 'morocco':                return '🇲🇦';
    case 'senegal':                                  return '🇸🇳';
    case 'japón': case 'japon': case 'japan':        return '🇯🇵';
    case 'corea del sur': case 'korea republic':     return '🇰🇷';
    case 'australia':                                return '🇦🇺';
    case 'croacia': case 'croatia':                  return '🇭🇷';
    case 'bélgica': case 'belgica': case 'belgium':  return '🇧🇪';
    case 'suiza': case 'switzerland':                return '🇨🇭';
    case 'italia': case 'italy':                     return '🇮🇹';
    case 'polonia': case 'poland':                   return '🇵🇱';
    case 'serbia':                                   return '🇷🇸';
    case 'dinamarca': case 'denmark':                return '🇩🇰';
    case 'ecuador':                                  return '🇪🇨';
    case 'perú': case 'peru':                       return '🇵🇪';
    case 'chile':                                    return '🇨🇱';
    case 'venezuela':                                return '🇻🇪';
    case 'ghana':                                    return '🇬🇭';
    case 'nigeria':                                  return '🇳🇬';
    case 'turquía': case 'turquia': case 'turkey':   return '🇹🇷';
    case 'ucrania': case 'ukraine':                  return '🇺🇦';
    case 'austria':                                  return '🇦🇹';
    case 'escocia': case 'scotland':                 return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
    case 'gales': case 'wales':                      return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
    case 'grecia': case 'greece':                    return '🇬🇷';
    default:                                         return '🏳️';
  }
}
