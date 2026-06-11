// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Name Parser
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedName {
  firstName: string;
  lastName: string;
  middleName?: string;
  /** Lowercase search aliases for fuzzy matching */
  aliases: string[];
}

/**
 * Parse a full name string into structured components.
 *
 * Handles 1-, 2-, and multi-part names. Prefixes/suffixes (Mr, Dr, Jr, etc.)
 * are stripped before parsing.
 */
export function parseName(fullName: string): ParsedName {
  const stripped = stripHonorifics(fullName.trim());
  const parts = stripped.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', lastName: '', aliases: [] };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: '',
      aliases: [parts[0].toLowerCase()],
    };
  }

  if (parts.length === 2) {
    const [firstName, lastName] = parts;
    return {
      firstName,
      lastName,
      aliases: [
        firstName.toLowerCase(),
        lastName.toLowerCase(),
        `${firstName} ${lastName}`.toLowerCase(),
      ],
    };
  }

  // 3+ parts: first = parts[0], last = parts[last], middle = everything in between
  const firstName = parts[0];
  const lastName  = parts[parts.length - 1];
  const middleName = parts.slice(1, -1).join(' ');

  return {
    firstName,
    lastName,
    middleName,
    aliases: [
      firstName.toLowerCase(),
      lastName.toLowerCase(),
      middleName.toLowerCase(),
      `${firstName} ${lastName}`.toLowerCase(),
      `${firstName} ${middleName} ${lastName}`.toLowerCase(),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const HONORIFIC_PREFIXES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'dame',
  'rev', 'captain', 'capt', 'lt', 'col', 'gen', 'sgt',
]);

const HONORIFIC_SUFFIXES = new Set([
  'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'esq', 'dds',
]);

function stripHonorifics(name: string): string {
  const words = name.split(/\s+/);

  // Strip leading honorific (e.g. "Dr. Jane Smith" → "Jane Smith")
  if (words.length > 0) {
    const first = words[0].replace(/\./g, '').toLowerCase();
    if (HONORIFIC_PREFIXES.has(first)) {
      words.shift();
    }
  }

  // Strip trailing suffix (e.g. "John Smith Jr." → "John Smith")
  if (words.length > 0) {
    const last = words[words.length - 1].replace(/[.,]/g, '').toLowerCase();
    if (HONORIFIC_SUFFIXES.has(last)) {
      words.pop();
    }
  }

  return words.join(' ');
}
