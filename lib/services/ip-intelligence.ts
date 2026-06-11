// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — IP Intelligence Service
//
// Primary:  ipapi.is  (requires IPAPI_IS_KEY)
// Fallback: ip-api.com (free, no key required)
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import { isPrivateIp } from '../utils/ip';
import type { IpIntelResult, ServiceResult, ServiceError } from '@/types/pipeline';

const log = childLogger('ip-intelligence');

// ── Raw API response shapes ───────────────────────────────────────────────────

interface IpapiIsResponse {
  ip?: string;
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
  connection?: { isp?: string; org?: string; asn?: string | number };
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_tor?: boolean;
  is_datacenter?: boolean;
  abuse?: { score?: number };
  error?: boolean;
  message?: string;
}

interface IpApiComResponse {
  status?: 'success' | 'fail';
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  message?: string;
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normalizeIpapiIs(ip: string, raw: IpapiIsResponse): IpIntelResult {
  return {
    ip,
    countryCode: raw.country_code ?? '',
    countryName: raw.country ?? '',
    region: raw.region ?? '',
    city: raw.city ?? '',
    postalCode: raw.postal,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone?.id,
    isp: raw.connection?.isp,
    org: raw.connection?.org,
    asn: raw.connection?.asn !== undefined ? String(raw.connection.asn) : undefined,
    isProxy: raw.is_proxy ?? false,
    isVpn: raw.is_vpn ?? false,
    isTor: raw.is_tor ?? false,
    isDatacenter: raw.is_datacenter ?? false,
    abuseScore: raw.abuse?.score,
  };
}

function normalizeIpApiCom(ip: string, raw: IpApiComResponse): IpIntelResult {
  return {
    ip,
    countryCode: raw.countryCode ?? '',
    countryName: raw.country ?? '',
    region: raw.regionName ?? '',
    city: raw.city ?? '',
    postalCode: raw.zip,
    latitude: raw.lat,
    longitude: raw.lon,
    timezone: raw.timezone,
    isp: raw.isp,
    org: raw.org,
    asn: raw.as,
    isProxy: false,
    isVpn: false,
    isTor: false,
    isDatacenter: false,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(code: string, message: string, retryable: boolean, statusCode?: number): ServiceError {
  return { code, message, retryable, statusCode };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Enrich an IP address with geolocation and threat intelligence.
 *
 * Tries ipapi.is first (if key configured), falls back to ip-api.com.
 */
export async function enrichIp(ip: string): Promise<ServiceResult<IpIntelResult>> {
  const start = Date.now();

  let lookupIp = ip;
  if (isPrivateIp(ip)) {
    log.info({ ip }, 'Private/loopback IP detected. Resolving host public WAN IP for accurate lookup...');
    try {
      const res = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ip) {
          lookupIp = data.ip;
          log.info({ lookupIp }, 'Resolved host public WAN IP successfully.');
        }
      }
    } catch (err) {
      log.warn({ err }, 'Failed to resolve host public WAN IP, using loopback IP.');
    }
  }

  // Re-assign so subsequent fetches and normalization use the public WAN IP
  ip = lookupIp;

  // ── Primary: ipapi.is ──────────────────────────────────────────────────────
  const ipapiKey = config.services.ipapiIs;

  if (ipapiKey) {
    try {
      log.debug({ ip }, 'Trying ipapi.is');

      const res = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}&key=${ipapiKey}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });

      if (res.ok) {
        const raw = (await res.json()) as IpapiIsResponse;

        if (!raw.error) {
          const data = normalizeIpapiIs(ip, raw);
          log.info({ ip, country: data.countryCode }, 'ipapi.is enrichment successful');
          return { success: true, data, latencyMs: Date.now() - start };
        }

        log.warn({ ip, message: raw.message }, 'ipapi.is returned error flag, falling back');
      } else {
        log.warn({ ip, status: res.status }, 'ipapi.is HTTP error, falling back');
      }
    } catch (err) {
      log.warn({ ip, err }, 'ipapi.is request failed, falling back');
    }
  }

  // ── Fallback: ip-api.com ───────────────────────────────────────────────────
  try {
    log.debug({ ip }, 'Trying ip-api.com fallback');

    const fields = 'status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as';
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      return {
        success: false,
        error: makeError('IP_API_HTTP_ERROR', `ip-api.com returned ${res.status}`, true, res.status),
        latencyMs: Date.now() - start,
      };
    }

    const raw = (await res.json()) as IpApiComResponse;

    if (raw.status !== 'success') {
      return {
        success: false,
        error: makeError('IP_API_FAIL', raw.message ?? 'ip-api.com status: fail', false),
        latencyMs: Date.now() - start,
      };
    }

    const data = normalizeIpApiCom(ip, raw);
    log.info({ ip, country: data.countryCode }, 'ip-api.com fallback enrichment successful');
    return { success: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ ip, err }, 'All IP enrichment providers failed');
    return {
      success: false,
      error: makeError('IP_ENRICHMENT_FAILED', `All providers failed: ${message}`, true),
      latencyMs: Date.now() - start,
    };
  }
}
