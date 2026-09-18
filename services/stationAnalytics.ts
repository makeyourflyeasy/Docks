import { Case } from '../types';

export interface StationMovementDetail {
  id: string;
  stationName: string;
  stationType: 'Sea Port' | 'Border Terminal' | 'Dry Port';
  city: string;
  code: string;
  totalMoved: number;
  customsClearance: number;
  afghanTransit: number;
  bondedCarrier: number;
  tirCarnet: number;
  privateCargo: number;
  twentyFtCount: number;
  fortyFtCount: number;
  primaryCorridors: string[];
  destinationsBreakdown?: Array<{
    name: string;
    type: 'Dry Port' | 'Border Terminal' | 'Country' | 'Port';
    containers: number;
    twentyFt: number;
    fortyFt: number;
  }>;
  countriesBreakdown?: Array<{
    country: string;
    portOrTerminal: string;
    containers: number;
  }>;
  recentCases: Array<{
    caseNo: string;
    blNumber: string;
    category: string;
    containerNo: string;
    size: string;
    destination: string;
    completionDate: string;
  }>;
}

export interface StationAnalyticsSummary {
  totalContainersMoved: number;
  totalCustomsClearance: number;
  totalAfghanTransit: number;
  totalBondedCarrier: number;
  totalTirCarnet: number;
  totalPrivateCargo: number;
  totalTwentyFt: number;
  totalFortyFt: number;
  activeStationsCount: number;
  // Category-specific sub-details
  bondedBreakdown: Array<{
    destination: string;
    containers: number;
    twentyFt: number;
    fortyFt: number;
    sharePercent: number;
  }>;
  afghanTransitBreakdown: Array<{
    borderOrTerminal: string;
    destinationCity: string;
    country: string;
    containers: number;
    sharePercent: number;
  }>;
  customsClearanceBreakdown: Array<{
    portName: string;
    gdType: string;
    containers: number;
    sharePercent: number;
  }>;
  tirBreakdown: Array<{
    country: string;
    borderPort: string;
    containers: number;
    sharePercent: number;
  }>;
}

interface StationBlueprint {
  id: string;
  name: string;
  type: 'Sea Port' | 'Border Terminal' | 'Dry Port';
  city: string;
  code: string;
  baseMonthlyVolume: number;
  clearanceRatio: number;
  transitRatio: number;
  bondedRatio: number;
  privateRatio: number;
  corridors: string[];
}

export const BASELINE_STATIONS: StationBlueprint[] = [
  // Sea Ports
  {
    id: 'kpt',
    name: 'Karachi Port Trust (KPT)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'KPT',
    baseMonthlyVolume: 342,
    clearanceRatio: 0.48,
    transitRatio: 0.33,
    bondedRatio: 0.13,
    privateRatio: 0.06,
    corridors: ['KPT ⇄ Torkham Border (ATT)', 'KPT ⇄ Lahore Dry Port (Bonded TP)', 'KPT ⇄ Faisalabad Dry Port']
  },
  {
    id: 'qict',
    name: 'Port Qasim (QICT)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'QICT',
    baseMonthlyVolume: 288,
    clearanceRatio: 0.44,
    transitRatio: 0.35,
    bondedRatio: 0.15,
    privateRatio: 0.06,
    corridors: ['QICT ⇄ Chaman Border (ATT)', 'QICT ⇄ Multan Dry Port (Bonded)', 'QICT ⇄ Lahore NLC']
  },
  {
    id: 'sapt',
    name: 'South Asia Pakistan Terminals (SAPT)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'SAPT',
    baseMonthlyVolume: 215,
    clearanceRatio: 0.46,
    transitRatio: 0.30,
    bondedRatio: 0.18,
    privateRatio: 0.06,
    corridors: ['SAPT ⇄ Torkham Border (ATT)', 'SAPT ⇄ Rawalpindi / Islamabad', 'SAPT ⇄ Sialkot Dry Port']
  },
  {
    id: 'kict',
    name: 'Karachi International Container Terminal (KICT)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'KICT',
    baseMonthlyVolume: 194,
    clearanceRatio: 0.46,
    transitRatio: 0.30,
    bondedRatio: 0.17,
    privateRatio: 0.07,
    corridors: ['KICT ⇄ Peshawar Dry Port (Azakhel)', 'KICT ⇄ Lahore Dry Port', 'KICT ⇄ Chaman Border']
  },
  {
    id: 'kgtl',
    name: 'Karachi Gateway Terminal (KGTL)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'KGTL',
    baseMonthlyVolume: 135,
    clearanceRatio: 0.50,
    transitRatio: 0.26,
    bondedRatio: 0.18,
    privateRatio: 0.06,
    corridors: ['KGTL ⇄ Faisalabad Dry Port', 'KGTL ⇄ Quetta NLC', 'KGTL ⇄ Torkham']
  },
  {
    id: 'aict',
    name: 'Al-Hamd International Container Terminal (AICT)',
    type: 'Sea Port',
    city: 'Karachi',
    code: 'AICT',
    baseMonthlyVolume: 112,
    clearanceRatio: 0.52,
    transitRatio: 0.24,
    bondedRatio: 0.18,
    privateRatio: 0.06,
    corridors: ['AICT ⇄ Off-Dock Yard Operations', 'AICT ⇄ Lahore Dry Port']
  },
  {
    id: 'gwd',
    name: 'Gwadar Port',
    type: 'Sea Port',
    city: 'Gwadar',
    code: 'GWD',
    baseMonthlyVolume: 64,
    clearanceRatio: 0.50,
    transitRatio: 0.28,
    bondedRatio: 0.14,
    privateRatio: 0.08,
    corridors: ['Gwadar ⇄ Taftan Border Terminal', 'Gwadar ⇄ Quetta Dry Port']
  },

  // Border Terminals (Major Afghan Transit Corridors)
  {
    id: 'tkh',
    name: 'Torkham Border Terminal',
    type: 'Border Terminal',
    city: 'Khyber Pass / Afghan Border',
    code: 'TKH',
    baseMonthlyVolume: 386,
    clearanceRatio: 0.06,
    transitRatio: 0.84, // Heavy Afghan Transit
    bondedRatio: 0.08,
    privateRatio: 0.02,
    corridors: ['KPT / QICT / SAPT ⇄ Torkham ⇄ Jalalabad & Kabul (ATT)', 'Azakhel Dry Port ⇄ Torkham']
  },
  {
    id: 'chm',
    name: 'Chaman Border Terminal',
    type: 'Border Terminal',
    city: 'Chaman / Afghan Border',
    code: 'CHM',
    baseMonthlyVolume: 295,
    clearanceRatio: 0.07,
    transitRatio: 0.82, // Heavy Afghan Transit
    bondedRatio: 0.08,
    privateRatio: 0.03,
    corridors: ['QICT / KPT ⇄ Chaman ⇄ Spin Boldak & Kandahar (ATT)', 'Quetta Dry Port ⇄ Chaman']
  },
  {
    id: 'wgh',
    name: 'Wagha Border Terminal',
    type: 'Border Terminal',
    city: 'Lahore Border',
    code: 'WGH',
    baseMonthlyVolume: 76,
    clearanceRatio: 0.65,
    transitRatio: 0.08,
    bondedRatio: 0.17,
    privateRatio: 0.10,
    corridors: ['Lahore Dry Port ⇄ Wagha Cross-Border', 'Karachi Ports ⇄ Wagha']
  },
  {
    id: 'tft',
    name: 'Taftan Border Terminal',
    type: 'Border Terminal',
    city: 'Chagai / Iran Border',
    code: 'TFT',
    baseMonthlyVolume: 84,
    clearanceRatio: 0.62,
    transitRatio: 0.12,
    bondedRatio: 0.16,
    privateRatio: 0.10,
    corridors: ['Quetta Dry Port ⇄ Taftan ⇄ Mirjaveh', 'Gwadar Port ⇄ Taftan']
  },
  {
    id: 'gkh',
    name: 'Ghulam Khan Border Terminal',
    type: 'Border Terminal',
    city: 'North Waziristan',
    code: 'GKH',
    baseMonthlyVolume: 48,
    clearanceRatio: 0.05,
    transitRatio: 0.85,
    bondedRatio: 0.08,
    privateRatio: 0.02,
    corridors: ['Karachi Ports ⇄ Ghulam Khan ⇄ Khost (ATT)']
  },

  // Dry Ports / Off-Dock Hubs
  {
    id: 'lhr',
    name: 'Lahore Dry Port (NLC / MICT / DPW)',
    type: 'Dry Port',
    city: 'Lahore',
    code: 'LHR',
    baseMonthlyVolume: 218,
    clearanceRatio: 0.44,
    transitRatio: 0.11,
    bondedRatio: 0.37, // High Bonded TP destination
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Lahore Dry Port (Bonded Carrier TP)', 'Lahore ⇄ Wagha Border']
  },
  {
    id: 'pew',
    name: 'Peshawar Dry Port (Azakhel / Jamrud)',
    type: 'Dry Port',
    city: 'Peshawar / Nowshera',
    code: 'PEW',
    baseMonthlyVolume: 152,
    clearanceRatio: 0.28,
    transitRatio: 0.50, // High Afghan Transit staging
    bondedRatio: 0.16,
    privateRatio: 0.06,
    corridors: ['Karachi Sea Ports ⇄ Azakhel Dry Port ⇄ Torkham Border (ATT)']
  },
  {
    id: 'fsd',
    name: 'Faisalabad Dry Port',
    type: 'Dry Port',
    city: 'Faisalabad',
    code: 'FSD',
    baseMonthlyVolume: 138,
    clearanceRatio: 0.52,
    transitRatio: 0.08,
    bondedRatio: 0.32,
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Faisalabad Textile Export Corridor']
  },
  {
    id: 'skt',
    name: 'Sialkot Dry Port (SICT)',
    type: 'Dry Port',
    city: 'Sialkot (Sambrial)',
    code: 'SKT',
    baseMonthlyVolume: 124,
    clearanceRatio: 0.56,
    transitRatio: 0.06,
    bondedRatio: 0.30,
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Sialkot Export & Surgical Goods Hub']
  },
  {
    id: 'mux',
    name: 'Multan Dry Port',
    type: 'Dry Port',
    city: 'Multan',
    code: 'MUX',
    baseMonthlyVolume: 104,
    clearanceRatio: 0.50,
    transitRatio: 0.08,
    bondedRatio: 0.34,
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Multan Cotton & Mango Export Corridor']
  },
  {
    id: 'isb',
    name: 'Islamabad Dry Port',
    type: 'Dry Port',
    city: 'Islamabad / Rawalpindi',
    code: 'ISB',
    baseMonthlyVolume: 88,
    clearanceRatio: 0.54,
    transitRatio: 0.08,
    bondedRatio: 0.30,
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Islamabad Capital Dry Port Corridor']
  },
  {
    id: 'uet',
    name: 'Quetta Dry Port (NLC / Railway)',
    type: 'Dry Port',
    city: 'Quetta',
    code: 'UET',
    baseMonthlyVolume: 94,
    clearanceRatio: 0.24,
    transitRatio: 0.44, // Afghan & Iran transit staging
    bondedRatio: 0.24,
    privateRatio: 0.08,
    corridors: ['Karachi Sea Ports ⇄ Quetta NLC ⇄ Chaman / Taftan Borders']
  }
];

// Helper to generate realistic sample completed cases for each station
function generateStationCases(
  station: StationBlueprint,
  totalMoved: number,
  fromDateStr: string,
  toDateStr: string
) {
  const cases = [];
  const start = new Date(fromDateStr).getTime();
  const end = new Date(toDateStr).getTime();
  const sampleCount = Math.min(6, Math.max(3, Math.round(totalMoved / 40)));

  const clients = [
    'Global Traders Ltd', 'Kabul Express Logistics', 'Swift Freight Cargo', 
    'Pak-Afghan Transit Link', 'Indus Valley Corporation', 'Asia Continental Shipping',
    'National Transit Cargo', 'Pamir Highway Forwarders'
  ];

  const blPrefixes = ['MSK', 'HLC', 'COS', 'CMA', 'MSC', 'ONE', 'OOCL'];
  const cntrPrefixes = ['MSKU', 'HLCU', 'TGHU', 'CMAU', 'MEDU', 'ONEY', 'FSCU'];

  for (let i = 0; i < sampleCount; i++) {
    // Generate pseudo-deterministic values
    const hash = (station.name.length * 17 + i * 31 + totalMoved) % 1000;
    const randomTime = start + ((hash * 997) % (end - start + 1));
    const d = new Date(randomTime);
    const dateFormatted = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

    let category = 'Afghan Transit';
    if (i % 5 === 0) category = 'Customs Clearance';
    else if (i % 5 === 1) category = 'Afghan Transit';
    else if (i % 5 === 2) category = 'Bonded Carrier';
    else if (i % 5 === 3) category = 'TIR Carnet';
    else category = 'Transportation of Private Cargo';

    // Override if border terminal
    if (station.type === 'Border Terminal') {
      category = (i % 2 === 0) ? 'Afghan Transit' : 'TIR Carnet';
    }

    const blNo = `${blPrefixes[i % blPrefixes.length]}-${hash + 1000}`;
    const cntrNo = `${cntrPrefixes[i % cntrPrefixes.length]}-${(hash * 7 + 1000000).toString().slice(0, 7)}`;
    const size = (hash % 3 === 0) ? '20ft' : '40ft High Cube';
    const client = clients[(i + hash) % clients.length];

    let destination = station.city;
    if (category === 'Afghan Transit') {
      destination = station.type === 'Border Terminal' ? 'Kabul / Kandahar Inland' : 'Torkham / Chaman Border (ATT)';
    } else if (category === 'Bonded Carrier') {
      destination = `${station.name} (Customs Bond)`;
    } else if (category === 'TIR Carnet') {
      destination = station.code === 'TFT' ? 'Taftan ⇄ Mirjaveh (Iran / Turkey)' : 'Torkham ⇄ Kabul / Central Asia (TIR)';
    } else {
      destination = `${station.city} Commercial Yard`;
    }

    cases.push({
      caseNo: `DPL-26-${(10000 + hash + i).toString().slice(1)}`,
      blNumber: blNo,
      category: category,
      containerNo: cntrNo,
      size: size,
      destination: destination,
      completionDate: dateFormatted
    });
  }

  return cases;
}

export function calculateStationMovements(
  fromDateStr: string,
  toDateStr: string,
  selectedPOL: string,
  selectedPOU: string,
  liveCases: Case[] = [],
  selectedPort: string = 'ALL',
  categoryFilter: string = 'ALL'
): { movements: StationMovementDetail[]; summary: StationAnalyticsSummary } {
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const diffTime = Math.max(1, Math.abs(to.getTime() - from.getTime()));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Normalize ratio against standard 30-day baseline
  const durationFactor = Math.min(4.0, Math.max(0.15, diffDays / 30));

  // Determine if specific ports are filtered
  const portIsSpecific = selectedPort && selectedPort !== 'ALL';
  const polIsSpecific = selectedPOL !== 'ALL';
  const pouIsSpecific = selectedPOU !== 'ALL';

  const movements: StationMovementDetail[] = [];

  for (const station of BASELINE_STATIONS) {
    // If specific single port is selected, only show that exact station/port
    if (portIsSpecific) {
      const matchPort = station.name.toLowerCase() === selectedPort.toLowerCase() ||
                        station.name.toLowerCase().includes(selectedPort.toLowerCase()) ||
                        selectedPort.toLowerCase().includes(station.name.toLowerCase()) ||
                        station.code.toLowerCase() === selectedPort.toLowerCase();
      if (!matchPort) {
        continue;
      }
    }

    // If specific POL is selected, and it's a Sea Port that doesn't match, or doesn't connect
    if (polIsSpecific) {
      const matchPOL = station.name.toLowerCase().includes(selectedPOL.toLowerCase()) || 
                       selectedPOL.toLowerCase().includes(station.name.toLowerCase()) ||
                       station.code.toLowerCase() === selectedPOL.toLowerCase();
      // If it's a dry port or border, check if this station's corridors mention the selected POL
      const matchCorridor = station.corridors.some(c => c.toLowerCase().includes(selectedPOL.toLowerCase()));
      if (!matchPOL && !matchCorridor) {
        continue;
      }
    }

    // If specific POU is selected
    if (pouIsSpecific) {
      const matchPOU = station.name.toLowerCase().includes(selectedPOU.toLowerCase()) || 
                       selectedPOU.toLowerCase().includes(station.name.toLowerCase()) ||
                       station.code.toLowerCase() === selectedPOU.toLowerCase();
      const matchCorridor = station.corridors.some(c => c.toLowerCase().includes(selectedPOU.toLowerCase()));
      if (!matchPOU && !matchCorridor) {
        continue;
      }
    }

    // Calculate dynamic volumes
    const calculatedTotal = Math.max(8, Math.round(station.baseMonthlyVolume * durationFactor));
    
    // Allocate realistic distribution including TIR Carnet (international road transit)
    // Border terminals and international dry ports handle TIR
    const tirRatio = (station.type === 'Border Terminal') ? 0.12 : (station.type === 'Sea Port' ? 0.05 : 0.04);
    const tirCount = Math.max(1, Math.round(calculatedTotal * tirRatio));

    const transitCount = Math.round(calculatedTotal * Math.max(0.04, station.transitRatio - tirRatio * 0.5));
    const clearanceCount = Math.round(calculatedTotal * station.clearanceRatio);
    const bondedCount = Math.round(calculatedTotal * station.bondedRatio);
    const privateCount = Math.max(0, calculatedTotal - (transitCount + clearanceCount + bondedCount + tirCount));

    // Container sizing
    const twentyFtCount = Math.round(calculatedTotal * 0.42);
    const fortyFtCount = calculatedTotal - twentyFtCount;

    // Generate destinations breakdown for this station
    const destinationsBreakdown = [
      {
        name: 'Faisalabad Dry Port',
        type: 'Dry Port' as const,
        containers: Math.max(1, Math.round(bondedCount * 0.32)),
        twentyFt: Math.max(1, Math.round(bondedCount * 0.32 * 0.42)),
        fortyFt: Math.max(0, Math.round(bondedCount * 0.32 * 0.58))
      },
      {
        name: 'Sialkot Dry Port (SICT)',
        type: 'Dry Port' as const,
        containers: Math.max(1, Math.round(bondedCount * 0.28)),
        twentyFt: Math.max(1, Math.round(bondedCount * 0.28 * 0.42)),
        fortyFt: Math.max(0, Math.round(bondedCount * 0.28 * 0.58))
      },
      {
        name: 'Lahore Dry Port (NLC/MICT)',
        type: 'Dry Port' as const,
        containers: Math.max(1, Math.round(bondedCount * 0.25)),
        twentyFt: Math.max(1, Math.round(bondedCount * 0.25 * 0.42)),
        fortyFt: Math.max(0, Math.round(bondedCount * 0.25 * 0.58))
      },
      {
        name: 'Multan / Rawalpindi Dry Ports',
        type: 'Dry Port' as const,
        containers: Math.max(1, Math.max(1, bondedCount - Math.round(bondedCount * 0.85))),
        twentyFt: Math.max(1, Math.round(bondedCount * 0.15 * 0.42)),
        fortyFt: Math.max(0, Math.round(bondedCount * 0.15 * 0.58))
      }
    ];

    // Generate countries / foreign ports breakdown for Afghan Transit and TIR
    const countriesBreakdown = [
      { country: 'Afghanistan', portOrTerminal: 'Torkham ⇄ Kabul / Jalalabad', containers: Math.round(transitCount * 0.55) },
      { country: 'Afghanistan', portOrTerminal: 'Chaman ⇄ Kandahar / Spin Boldak', containers: Math.round(transitCount * 0.35) },
      { country: 'Afghanistan', portOrTerminal: 'Ghulam Khan ⇄ Khost Province', containers: Math.max(1, transitCount - Math.round(transitCount * 0.9)) },
      { country: 'Iran / Turkey (TIR)', portOrTerminal: 'Taftan Border ⇄ Mirjaveh / Bazargan', containers: Math.round(tirCount * 0.65) },
      { country: 'Uzbekistan / Central Asia (TIR)', portOrTerminal: 'Torkham Border ⇄ Hairatan / Termez', containers: Math.max(1, tirCount - Math.round(tirCount * 0.65)) }
    ];

    // Generate recent dispatches
    let recentCases = generateStationCases(station, calculatedTotal, fromDateStr, toDateStr);

    // Merge any live cases matching this station
    if (liveCases && liveCases.length > 0) {
      const matchingLive = liveCases.filter(c => {
        const polMatch = c.pol && (station.name.toLowerCase().includes(c.pol.toLowerCase()) || station.code.toLowerCase() === c.pol.toLowerCase());
        const podMatch = c.pod && (station.name.toLowerCase().includes(c.pod.toLowerCase()) || station.code.toLowerCase() === c.pod.toLowerCase());
        return polMatch || podMatch;
      });

      if (matchingLive.length > 0) {
        const liveConverted = matchingLive.map((lc, idx) => ({
          caseNo: lc.caseNo || `DPL-LIVE-${idx + 1}`,
          blNumber: lc.extractedData?.blNumber || `BL-PK-${idx + 100}`,
          category: lc.category || 'Customs Clearance',
          containerNo: lc.containers?.[0]?.number || `CNTR-${idx + 1000}`,
          size: lc.containers?.[0]?.size || '40ft',
          destination: lc.pod || station.city,
          completionDate: lc.createdAt ? new Date(lc.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'
        }));
        recentCases = [...liveConverted, ...recentCases].slice(0, 8);
      }
    }

    // Filter movements by category if specified
    if (categoryFilter && categoryFilter !== 'ALL') {
      const isClearance = categoryFilter === 'CLEARANCE' || categoryFilter === 'Customs Clearance';
      const isTransit = categoryFilter === 'AFGHAN_TRANSIT' || categoryFilter === 'Afghan Transit';
      const isBonded = categoryFilter === 'BONDED' || categoryFilter === 'Bonded Carrier';
      const isTir = categoryFilter === 'TIR' || categoryFilter === 'TIR Carnet';
      const isPrivate = categoryFilter === 'PRIVATE' || categoryFilter === 'Private Cargo';

      if (isClearance && clearanceCount === 0) continue;
      if (isTransit && transitCount === 0) continue;
      if (isBonded && bondedCount === 0) continue;
      if (isTir && tirCount === 0) continue;
      if (isPrivate && privateCount === 0) continue;
    }

    movements.push({
      id: station.id,
      stationName: station.name,
      stationType: station.type,
      city: station.city,
      code: station.code,
      totalMoved: calculatedTotal,
      customsClearance: clearanceCount,
      afghanTransit: transitCount,
      bondedCarrier: bondedCount,
      tirCarnet: tirCount,
      privateCargo: privateCount,
      twentyFtCount: twentyFtCount,
      fortyFtCount: fortyFtCount,
      primaryCorridors: station.corridors,
      destinationsBreakdown,
      countriesBreakdown,
      recentCases: recentCases
    });
  }

  // Sort descending by total moved
  movements.sort((a, b) => b.totalMoved - a.totalMoved);

  const totalBonded = movements.reduce((acc, m) => acc + m.bondedCarrier, 0);
  const totalTransit = movements.reduce((acc, m) => acc + m.afghanTransit, 0);
  const totalClearance = movements.reduce((acc, m) => acc + m.customsClearance, 0);
  const totalTir = movements.reduce((acc, m) => acc + m.tirCarnet, 0);

  // Compute overall summary
  const summary: StationAnalyticsSummary = {
    totalContainersMoved: movements.reduce((acc, m) => acc + m.totalMoved, 0),
    totalCustomsClearance: totalClearance,
    totalAfghanTransit: totalTransit,
    totalBondedCarrier: totalBonded,
    totalTirCarnet: totalTir,
    totalPrivateCargo: movements.reduce((acc, m) => acc + m.privateCargo, 0),
    totalTwentyFt: movements.reduce((acc, m) => acc + m.twentyFtCount, 0),
    totalFortyFt: movements.reduce((acc, m) => acc + m.fortyFtCount, 0),
    activeStationsCount: movements.length,
    // Detailed itemized breakdowns
    bondedBreakdown: [
      {
        destination: 'Faisalabad Dry Port',
        containers: Math.round(totalBonded * 0.36),
        twentyFt: Math.round(totalBonded * 0.36 * 0.42),
        fortyFt: Math.round(totalBonded * 0.36 * 0.58),
        sharePercent: 36
      },
      {
        destination: 'Sialkot Dry Port (SICT)',
        containers: Math.round(totalBonded * 0.28),
        twentyFt: Math.round(totalBonded * 0.28 * 0.42),
        fortyFt: Math.round(totalBonded * 0.28 * 0.58),
        sharePercent: 28
      },
      {
        destination: 'Lahore Dry Port (NLC / MICT / DPW)',
        containers: Math.round(totalBonded * 0.22),
        twentyFt: Math.round(totalBonded * 0.22 * 0.42),
        fortyFt: Math.round(totalBonded * 0.22 * 0.58),
        sharePercent: 22
      },
      {
        destination: 'Multan Dry Port',
        containers: Math.round(totalBonded * 0.08),
        twentyFt: Math.round(totalBonded * 0.08 * 0.42),
        fortyFt: Math.round(totalBonded * 0.08 * 0.58),
        sharePercent: 8
      },
      {
        destination: 'Islamabad & Rawalpindi Dry Port',
        containers: Math.max(1, totalBonded - Math.round(totalBonded * 0.94)),
        twentyFt: Math.max(1, Math.round(totalBonded * 0.06 * 0.42)),
        fortyFt: Math.max(0, Math.round(totalBonded * 0.06 * 0.58)),
        sharePercent: 6
      }
    ],
    afghanTransitBreakdown: [
      {
        borderOrTerminal: 'Torkham Border Terminal (TKH)',
        destinationCity: 'Jalalabad / Kabul Inland',
        country: 'Afghanistan',
        containers: Math.round(totalTransit * 0.56),
        sharePercent: 56
      },
      {
        borderOrTerminal: 'Chaman Border Terminal (CHM)',
        destinationCity: 'Spin Boldak / Kandahar',
        country: 'Afghanistan',
        containers: Math.round(totalTransit * 0.32),
        sharePercent: 32
      },
      {
        borderOrTerminal: 'Ghulam Khan Terminal (GKH)',
        destinationCity: 'Khost Province',
        country: 'Afghanistan',
        containers: Math.round(totalTransit * 0.07),
        sharePercent: 7
      },
      {
        borderOrTerminal: 'Kharlachi & Badini Crossings',
        destinationCity: 'Paktia / Central Highlands',
        country: 'Afghanistan',
        containers: Math.max(1, totalTransit - Math.round(totalTransit * 0.95)),
        sharePercent: 5
      }
    ],
    customsClearanceBreakdown: [
      {
        portName: 'Karachi Port Trust (KPT)',
        gdType: 'Home Consumption (GD-HC) & Wharves',
        containers: Math.round(totalClearance * 0.38),
        sharePercent: 38
      },
      {
        portName: 'Port Qasim (QICT)',
        gdType: 'Direct Off-Dock Clearance',
        containers: Math.round(totalClearance * 0.30),
        sharePercent: 30
      },
      {
        portName: 'South Asia Pakistan Terminals (SAPT)',
        gdType: 'Deep Water Terminal Clearance',
        containers: Math.round(totalClearance * 0.18),
        sharePercent: 18
      },
      {
        portName: 'Karachi International Container Terminal (KICT)',
        gdType: 'Terminal & CFS Clearance',
        containers: Math.max(1, totalClearance - Math.round(totalClearance * 0.86)),
        sharePercent: 14
      }
    ],
    tirBreakdown: [
      {
        country: 'Iran & Turkey',
        borderPort: 'Taftan Border Terminal ⇄ Mirjaveh / Bazargan',
        containers: Math.round(totalTir * 0.52),
        sharePercent: 52
      },
      {
        country: 'Uzbekistan & Central Asia',
        borderPort: 'Torkham ⇄ Hairatan / Termez Road Gateway',
        containers: Math.round(totalTir * 0.30),
        sharePercent: 30
      },
      {
        country: 'China (Karakoram Highway - KKH)',
        borderPort: 'Sost Dry Port ⇄ Khunjerab Pass / Tashkurgan',
        containers: Math.round(totalTir * 0.12),
        sharePercent: 12
      },
      {
        country: 'Turkmenistan / Azerbaijan',
        borderPort: 'Chaman ⇄ Torghundi / Serkhetabat Corridor',
        containers: Math.max(1, totalTir - Math.round(totalTir * 0.94)),
        sharePercent: 6
      }
    ]
  };

  return { movements, summary };
}
