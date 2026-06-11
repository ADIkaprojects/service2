'use client';

import React from 'react';

interface IpEnrichmentData {
  ip: string;
  provider: string;
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  city?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  companyName?: string;
  companyDomain?: string;
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  confidenceScore: number;
  resolutionStatus: 'resolved' | 'partial' | 'failed' | 'skipped' | 'pending';
}

interface IpEnrichmentPanelProps {
  ipEnrichment: IpEnrichmentData | null;
  sessionIp?: string;
}

export function IpEnrichmentPanel({ ipEnrichment, sessionIp }: IpEnrichmentPanelProps) {
  if (!ipEnrichment) {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed var(--border)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 4px 0' }}>
          IP Intelligence Data
        </h3>
        <p style={{ fontSize: '12px', margin: 0 }}>
          IP Enrichment stage has not completed or was skipped. Session IP is: {sessionIp || 'unknown'}.
        </p>
      </div>
    );
  }

  const {
    ip,
    provider,
    countryName,
    countryCode,
    regionName,
    city,
    isp,
    org,
    asn,
    companyName,
    companyDomain,
    isVpn,
    isProxy,
    isDatacenter,
    confidenceScore,
    resolutionStatus,
  } = ipEnrichment;

  // Determine Verdict
  let verdictTitle = 'Residential / Consumer IP';
  let verdictDesc = `This visitor is browsing from a residential or commercial ISP (${isp || 'Unknown ISP'}). No specific corporate domain could be automatically mapped.`;
  let verdictColor = '#f59e0b'; // Amber
  let verdictBg = 'rgba(245, 158, 11, 0.04)';
  let verdictBorder = 'rgba(245, 158, 11, 0.15)';

  if (resolutionStatus === 'failed') {
    verdictTitle = 'IP Intelligence Failed';
    verdictDesc = 'The IP address resolution failed. This typically occurs for local loopback subnets (like ::1 or 127.0.0.1) or when API rate limits are hit.';
    verdictColor = '#ef4444';
    verdictBg = 'rgba(239, 68, 68, 0.04)';
    verdictBorder = 'rgba(239, 68, 68, 0.15)';
  } else if (isDatacenter) {
    verdictTitle = 'Datacenter / Hosting Provider Detected';
    verdictDesc = `This request originated from a datacenter hosting range (${isp || 'Unknown Hosting'}). Personal enrichment and automated contact cascades are disabled to prevent bots or proxy noise.`;
    verdictColor = '#ef4444';
    verdictBg = 'rgba(239, 68, 68, 0.04)';
    verdictBorder = 'rgba(239, 68, 68, 0.15)';
  } else if (isVpn || isProxy) {
    verdictTitle = 'VPN / Anonymous Proxy Active';
    verdictDesc = `Visitor has an active VPN/Proxy tunnel (${isp || 'Anonymous Provider'}). Geolocation data and corporate mappings are unreliable.`;
    verdictColor = '#3b82f6';
    verdictBg = 'rgba(59, 130, 246, 0.04)';
    verdictBorder = 'rgba(59, 130, 246, 0.15)';
  } else if (companyDomain || (org && (org.toLowerCase().includes('inc') || org.toLowerCase().includes('ltd') || org.toLowerCase().includes('llc') || org.toLowerCase().includes('corp') || org.toLowerCase().includes('university')))) {
    const resolvedName = companyName || org || 'Corporate Subnet';
    verdictTitle = 'Corporate Visitor Identified';
    verdictDesc = `Resolved to corporate entity: ${resolvedName}${companyDomain ? ` (${companyDomain})` : ''}. This IP subnet belongs directly to a company, triggering the identity lookup cascade.`;
    verdictColor = '#10b981';
    verdictBg = 'rgba(16, 185, 129, 0.04)';
    verdictBorder = 'rgba(16, 185, 129, 0.15)';
  }

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            IP &amp; Network Intelligence
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Powered by {provider} (Score: {Math.round(confidenceScore * 100)}%)
          </span>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#f8fafc',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontFamily: 'monospace',
          }}
        >
          {ip}
        </span>
      </div>

      {/* Grid Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left Specification Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>NETWORK OWNER / ORG</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>{org || 'N/A'}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>INTERNET SERVICE PROVIDER</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>{isp || 'N/A'}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>AUTONOMOUS SYSTEM (ASN)</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, fontFamily: 'monospace' }}>{asn || 'N/A'}</span>
          </div>
        </div>

        {/* Right Specification Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>GEOGRAPHIC LOCATION</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
              {city ? `${city}, ` : ''}{regionName ? `${regionName}, ` : ''}{countryName || countryCode || 'Unknown'}
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RISK SIGNALS</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isDatacenter ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                  color: isDatacenter ? '#ef4444' : '#10b981',
                  border: `1px solid ${isDatacenter ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)'}`,
                }}
              >
                Datacenter: {isDatacenter ? 'Yes' : 'No'}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isVpn ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                  color: isVpn ? '#f59e0b' : '#10b981',
                  border: `1px solid ${isVpn ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)'}`,
                }}
              >
                VPN: {isVpn ? 'Yes' : 'No'}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isProxy ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                  color: isProxy ? '#f59e0b' : '#10b981',
                  border: `1px solid ${isProxy ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)'}`,
                }}
              >
                Proxy: {isProxy ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />

      {/* Verdict Panel */}
      <div
        style={{
          background: verdictBg,
          border: `1px solid ${verdictBorder}`,
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: verdictColor, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          VERDICT: {verdictTitle}
        </span>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
          {verdictDesc}
        </p>
      </div>
    </div>
  );
}
