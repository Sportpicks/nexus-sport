const FLAGS: Record<string, string> = {
  "Brasil": "🇧🇷", "Argentina": "🇦🇷", "Francia": "🇫🇷", "Alemania": "🇩🇪",
  "España": "🇪🇸", "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Portugal": "🇵🇹", "Países Bajos": "🇳🇱",
  "Holanda": "🇳🇱", "Uruguay": "🇺🇾", "Colombia": "🇨🇴", "México": "🇲🇽",
  "Estados Unidos": "🇺🇸", "USA": "🇺🇸", "Canadá": "🇨🇦", "Marruecos": "🇲🇦",
  "Senegal": "🇸🇳", "Japón": "🇯🇵", "Corea del Sur": "🇰🇷", "Australia": "🇦🇺",
  "Croacia": "🇭🇷", "Bélgica": "🇧🇪", "Suiza": "🇨🇭", "Italia": "🇮🇹",
  "Polonia": "🇵🇱", "Serbia": "🇷🇸", "Dinamarca": "🇩🇰", "Ecuador": "🇪🇨",
  "Perú": "🇵🇪", "Chile": "🇨🇱", "Venezuela": "🇻🇪", "Bolivia": "🇧🇴",
  "Paraguay": "🇵🇾", "Costa Rica": "🇨🇷", "Panamá": "🇵🇦", "Jamaica": "🇯🇲",
  "Ghana": "🇬🇭", "Nigeria": "🇳🇬", "Camerún": "🇨🇲", "Costa de Marfil": "🇨🇮",
  "Irán": "🇮🇷", "Arabia Saudita": "🇸🇦", "Qatar": "🇶🇦", "Turquía": "🇹🇷",
  "Ucrania": "🇺🇦", "Austria": "🇦🇹", "Hungría": "🇭🇺", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Gales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "República Checa": "🇨🇿", "Rumania": "🇷🇴",
  "Grecia": "🇬🇷", "Albania": "🇦🇱", "Eslovenia": "🇸🇮",
};

export function getFlag(name: string): string {
  return FLAGS[name] ?? "🏳️";
}
