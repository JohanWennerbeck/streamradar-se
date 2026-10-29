/**
 * JustWatch GraphQL Client for Sweden (SE)
 * No API key required; connects directly to https://apis.justwatch.com/graphql
 */

export const PROVIDERS = [
  {
    id: 'nfx',
    name: 'Netflix',
    packageId: 8,
    color: '#E50914',
    badgeBg: 'rgba(229, 9, 20, 0.2)',
    badgeBorder: '#E50914',
    candidateIds: ['org.tizen.netflix-app', '3201907018807'],
    tizenAppId: 'org.tizen.netflix-app',
    webUrl: 'https://www.netflix.com'
  },
  {
    id: 'dnp',
    name: 'Disney+',
    packageId: 337,
    color: '#113CCF',
    badgeBg: 'rgba(17, 60, 207, 0.25)',
    badgeBorder: '#3b82f6',
    candidateIds: ['MCmYXNxgcu.DisneyPlus', '3201901017640'],
    tizenAppId: 'MCmYXNxgcu.DisneyPlus',
    webUrl: 'https://www.disneyplus.com'
  },
  {
    id: 'mxx',
    name: 'Max',
    packageId: 1899,
    color: '#002BE7',
    badgeBg: 'rgba(0, 43, 231, 0.25)',
    badgeBorder: '#6366f1',
    candidateIds: ['5b8c3eb16b.BeamCTVDev', 'cj37Ni3qXM.HBONow', 'k72191847c.Max', '3202301029760'],
    tizenAppId: '5b8c3eb16b.BeamCTVDev',
    webUrl: 'https://www.max.com'
  },
  {
    id: 'prv',
    name: 'Prime Video',
    packageId: 119,
    color: '#00A8E1',
    badgeBg: 'rgba(0, 168, 225, 0.2)',
    badgeBorder: '#00A8E1',
    candidateIds: ['org.tizen.primevideo', '3201910019365', '3201910019355'],
    tizenAppId: 'org.tizen.primevideo',
    webUrl: 'https://www.primevideo.com'
  },
  {
    id: 'svt',
    name: 'SVT Play',
    packageId: 493,
    color: '#00BA55',
    badgeBg: 'rgba(0, 186, 85, 0.25)',
    badgeBorder: '#10b981',
    candidateIds: ['5exPmCT0nz.svtplay', '5071898972.SVTPlay', '3201612011287', '3201611010983'],
    tizenAppId: '5exPmCT0nz.svtplay',
    webUrl: 'https://www.svtplay.se'
  }
];

export const ALL_PACKAGE_CODES = PROVIDERS.map(p => p.id);

const GRAPHQL_ENDPOINT = 'https://apis.justwatch.com/graphql';
const IMAGE_BASE_URL = 'https://images.justwatch.com';

export function formatImageUrl(path, size = 's592', format = 'webp') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}${path.replace('{profile}', size).replace('{format}', format)}`;
}

async function fetchGraphQL(query, variables) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`JustWatch API HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`GraphQL Error: ${json.errors[0].message}`);
  }
  return json.data;
}

const TITLE_FRAGMENT = `
  id
  objectId
  objectType
  content(country: $country, language: "en") {
    title
    originalReleaseYear
    shortDescription
    posterUrl
    backdrops {
      backdropUrl
    }
    scoring {
      imdbScore
      imdbVotes
    }
    genres {
      shortName
      translation(language: "en")
    }
  }
  offers(country: $country, platform: WEB) {
    monetizationType
    standardWebURL
    package {
      packageId
      clearName
      shortName
      icon
    }
    retailPriceValue
    currency
  }
`;

/**
 * Fetch popular / trending titles filtered to Sweden and selected streaming packages
 */
export async function getTrendingTitles(packages = ALL_PACKAGE_CODES, first = 28) {
  const query = `
    query GetPopularTitles($country: Country!, $packages: [String!], $first: Int!) {
      popularTitles(
        country: $country
        filter: {
          packages: $packages
        }
        first: $first
      ) {
        edges {
          node {
            ${TITLE_FRAGMENT}
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    country: 'SE',
    packages,
    first
  });

  return (data?.popularTitles?.edges || []).map(edge => formatTitleNode(edge.node));
}

/**
 * Search any movie or TV series across Sweden catalogs
 */
export async function searchTitles(searchQuery, first = 24) {
  const query = `
    query SearchTitles($country: Country!, $query: String!, $first: Int!) {
      popularTitles(
        country: $country
        filter: {
          searchQuery: $query
        }
        first: $first
      ) {
        edges {
          node {
            ${TITLE_FRAGMENT}
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    country: 'SE',
    query: searchQuery,
    first
  });

  return (data?.popularTitles?.edges || []).map(edge => formatTitleNode(edge.node));
}

/**
 * Fetch upcoming releases (2026 / new additions) in Sweden
 */
export async function getUpcomingTitles(packages = ALL_PACKAGE_CODES, first = 28) {
  const currentYear = new Date().getFullYear();
  const query = `
    query GetUpcomingTitles($country: Country!, $packages: [String!], $first: Int!, $minYear: Int!) {
      popularTitles(
        country: $country
        filter: {
          packages: $packages
          releaseYear: { min: $minYear }
        }
        sortBy: POPULAR
        first: $first
      ) {
        edges {
          node {
            ${TITLE_FRAGMENT}
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    country: 'SE',
    packages,
    first,
    minYear: currentYear
  });

  return (data?.popularTitles?.edges || []).map(edge => formatTitleNode(edge.node));
}

function formatTitleNode(node) {
  const content = node.content || {};
  const scoring = content.scoring || {};
  const backdrops = content.backdrops || [];
  const rawOffers = node.offers || [];

  const streamOffers = [];
  const rentOrBuyOffers = [];
  const seenPackages = new Set();

  for (const offer of rawOffers) {
    const pkg = offer.package;
    if (!pkg) continue;

    const key = `${offer.monetizationType}_${pkg.packageId}`;
    if (seenPackages.has(key)) continue;
    seenPackages.add(key);

    const isFlatrateOrFree = offer.monetizationType === 'FLATRATE' || offer.monetizationType === 'FREE' || offer.monetizationType === 'ADS';
    const isTargetService = PROVIDERS.some(p => p.id === pkg.shortName || p.packageId === pkg.packageId || pkg.clearName.toLowerCase().includes(p.name.toLowerCase()));

    const providerObj = PROVIDERS.find(p => p.id === pkg.shortName || p.packageId === pkg.packageId) || {
      name: pkg.clearName,
      color: '#475569',
      badgeBg: 'rgba(71, 85, 105, 0.3)',
      badgeBorder: '#64748b',
      tizenAppId: null,
      webUrl: offer.standardWebURL
    };

    const offerItem = {
      type: offer.monetizationType,
      packageId: pkg.packageId,
      shortName: pkg.shortName,
      clearName: pkg.clearName,
      provider: providerObj,
      isTarget: isTargetService,
      price: offer.retailPriceValue,
      currency: offer.currency || 'SEK',
      url: offer.standardWebURL
    };

    if (isFlatrateOrFree) {
      streamOffers.push(offerItem);
    } else {
      rentOrBuyOffers.push(offerItem);
    }
  }

  // Sort: target services first
  streamOffers.sort((a, b) => (b.isTarget ? 1 : 0) - (a.isTarget ? 1 : 0));

  return {
    id: node.id,
    objectId: node.objectId,
    type: node.objectType, // 'MOVIE' | 'SHOW'
    title: content.title || 'Untitled',
    year: content.originalReleaseYear || 'N/A',
    description: content.shortDescription || 'No description available.',
    posterUrl: formatImageUrl(content.posterUrl, 's592', 'webp'),
    cardPosterUrl: formatImageUrl(content.posterUrl, 's332', 'webp'),
    backdropUrl: backdrops.length > 0 ? formatImageUrl(backdrops[0].backdropUrl, 's1920', 'webp') : '',
    imdbScore: scoring.imdbScore ? scoring.imdbScore.toFixed(1) : null,
    imdbVotes: scoring.imdbVotes,
    genres: (content.genres || []).map(g => g.translation),
    streamOffers,
    rentOrBuyOffers,
    hasMyService: streamOffers.some(o => o.isTarget)
  };
}
