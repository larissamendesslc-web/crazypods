export type StoreTheme = "smoke" | "natal" | "ano-novo" | "halloween" | "premium" | "padrao";

export type StoreThemeExperience = {
  id: StoreTheme;
  label: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  collectionKicker: string;
  collectionTitle: string;
  collectionHighlight: string;
  collectionDescription: string;
  productsKicker: string;
  productsTitle: string;
  productsHighlight: string;
  ribbon: string;
  deliveryMessage: string;
  deliveryTitle: string;
  footer: string;
  art: string | null;
  accentIcon: "sparkle" | "gift" | "sun" | "moon";
};

export const STORE_THEMES: Record<StoreTheme, StoreThemeExperience> = {
  smoke: {
    id: "smoke", label: "Crazy Smoke", eyebrow: "CRAZY PODS · BLACK EDITION",
    title: "Entre na", highlight: "experiência Crazy.",
    subtitle: "A vitrine ganha outra dimensão. Uma seleção com atitude, personalidade e a energia da noite.",
    collectionKicker: "EXPERIÊNCIA BLACK EDITION", collectionTitle: "Escolhas com", collectionHighlight: "atitude.",
    collectionDescription: "Descubra os destaques preparados pela loja.",
    productsKicker: "NA PISTA", productsTitle: "Explore nossa", productsHighlight: "seleção",
    ribbon: "CRAZY SMOKE · BLACK EDITION", deliveryMessage: "VIBRAÇÃO CR​AZY", deliveryTitle: "O próximo destaque é você.",
    footer: "Uma nova dimensão da Crazy Pods.", art: null, accentIcon: "sparkle",
  },
  natal: {
    id: "natal", label: "Crazy Christmas", eyebrow: "CRAZY PODS · CHRISTMAS EDITION",
    title: "O Natal fica", highlight: "mais Crazy.",
    subtitle: "Uma temporada de luzes, surpresas e novas descobertas. Encontre algo especial na nossa vitrine.",
    collectionKicker: "EDIÇÃO DE NATAL", collectionTitle: "Uma vitrine de", collectionHighlight: "surpresas.",
    collectionDescription: "Descubra a seleção especial da temporada, com um toque de magia e identidade Crazy.",
    productsKicker: "PRESENTES & DESCOBERTAS", productsTitle: "Novidades de", productsHighlight: "Natal",
    ribbon: "ESPECIAL DE NATAL · CRAZY PODS", deliveryMessage: "TEMPORADA ESPECIAL", deliveryTitle: "Uma experiência para surpreender.",
    footer: "A magia da temporada encontra a Crazy Pods.", art: "/crazy-christmas-stage.svg", accentIcon: "gift",
  },
  "ano-novo": {
    id: "ano-novo", label: "Crazy New Year", eyebrow: "CRAZY PODS · NEW YEAR EDITION",
    title: "Vire o ano.", highlight: "Viva o novo.",
    subtitle: "Uma nova energia, novas escolhas e a mesma essência Crazy. Sua próxima descoberta começa aqui.",
    collectionKicker: "COMECE UM NOVO CAPÍTULO", collectionTitle: "Tudo pronto para", collectionHighlight: "o novo.",
    collectionDescription: "Explore a vitrine e descubra novas possibilidades para começar o ano.",
    productsKicker: "NOVA TEMPORADA", productsTitle: "O novo começa", productsHighlight: "aqui",
    ribbon: "NEW YEAR EDITION · UMA NOVA ENERGIA", deliveryMessage: "BRILHE NESTE ANO", deliveryTitle: "O novo tem a sua cara.",
    footer: "Uma nova etapa. A mesma essência Crazy.", art: "/crazy-newyear-stage.svg", accentIcon: "sparkle",
  },
  halloween: {
    id: "halloween", label: "Crazy After Dark", eyebrow: "CRAZY PODS · AFTER DARK",
    title: "O inesperado", highlight: "te espera.",
    subtitle: "Uma temporada de mistério, luzes intensas e surpresas. Descubra o lado mais ousado da Crazy.",
    collectionKicker: "EDIÇÃO AFTER DARK", collectionTitle: "Explore o lado", collectionHighlight: "inesperado.",
    collectionDescription: "A seleção da loja em um clima de Halloween.",
    productsKicker: "À LUZ DA LUA", productsTitle: "Conheça as", productsHighlight: "novidades",
    ribbon: "AFTER DARK · EDIÇÃO DE HALLOWEEN", deliveryMessage: "NOITE CRAZY", deliveryTitle: "Encontre sua próxima surpresa.",
    footer: "O lado misterioso da Crazy Pods.", art: "/crazy-halloween-stage.svg", accentIcon: "moon",
  },
  premium: {
    id: "premium", label: "Crazy Premium", eyebrow: "CRAZY PODS · PREMIUM EXPERIENCE",
    title: "O extraordinário", highlight: "do seu jeito.",
    subtitle: "Uma experiência com estilo, detalhe e a identidade inconfundível da Crazy Pods.",
    collectionKicker: "CURADORIA CRAZY", collectionTitle: "Explore nossos", collectionHighlight: "destaques",
    collectionDescription: "Um jeito especial de conhecer as novidades da loja.",
    productsKicker: "NOSSA SELEÇÃO", productsTitle: "Descubra o", productsHighlight: "diferente",
    ribbon: "CRAZY PREMIUM · EXPERIÊNCIA SEM IGUAL", deliveryMessage: "ESSÊNCIA PREMIUM", deliveryTitle: "Descubra algo extraordinário.",
    footer: "A identidade Crazy em cada detalhe.", art: null, accentIcon: "sparkle",
  },
  padrao: {
    id: "padrao", label: "Crazy Neon", eyebrow: "CRAZY PODS · NEON CLUB",
    title: "Sua próxima", highlight: "descoberta.",
    subtitle: "Uma vitrine criativa, cores vibrantes e muita personalidade. É o universo Crazy.",
    collectionKicker: "NEON CLUB", collectionTitle: "Destaques da", collectionHighlight: "Crazy",
    collectionDescription: "Explore a seleção da loja em uma experiência cheia de energia.",
    productsKicker: "ESCOLHAS CRAZY", productsTitle: "Encontre sua", productsHighlight: "vibe",
    ribbon: "CRAZY NEON · VIBRE O DIFERENTE", deliveryMessage: "NUNCA COMUM", deliveryTitle: "Sua vibe, sua escolha.",
    footer: "Energia e estilo do seu jeito.", art: null, accentIcon: "sparkle",
  },
};

export function normalizeStoreTheme(theme: string | null | undefined): StoreTheme {
  return theme && Object.prototype.hasOwnProperty.call(STORE_THEMES, theme)
    ? theme as StoreTheme
    : "smoke";
}

export function themeExperience(theme: string | null | undefined): StoreThemeExperience {
  return STORE_THEMES[normalizeStoreTheme(theme)];
}

export function themedDefault(original: string, stored: string | null | undefined, seasonal: string): string {
  return !stored || stored === original ? seasonal : stored;
}
