/**
 * GAA XML Parser
 * 
 * Parses professional iSportsAnalysis XML files to extract all game events and statistics.
 * Matches the structure of Anadi's professional analysis format.
 */

export interface XMLEvent {
  id: string
  startTime: number // seconds
  endTime: number // seconds
  code: string
  labels: string[]
  team?: 'home' | 'away'
}

export interface XMLGameStats {
  totalEvents: number
  eventsByCode: Record<string, number>
  events: XMLEvent[]
  
  // Possession stats
  possession: {
    home: { count: number; duration: number }
    away: { count: number; duration: number }
  }
  
  // Shot stats
  shots: {
    home: {
      total: number
      goals: number
      points: number
      wides: number
      shortKeeper: number
      saved: number
      m45: number
      reboundPost: number
      other: number
      fromPlay: number
      fromFree: number
    }
    away: {
      total: number
      goals: number
      points: number
      wides: number
      shortKeeper: number
      saved: number
      m45: number
      reboundPost: number
      other: number
      fromPlay: number
      fromFree: number
    }
  }
  
  // Kickout stats
  kickouts: {
    home: {
      total: number
      long: number
      short: number
      mid: number
      won: number
      lost: number
      left: number
      centre: number
      right: number
    }
    away: {
      total: number
      long: number
      short: number
      mid: number
      won: number
      lost: number
      left: number
      centre: number
      right: number
    }
  }
  
  // Turnover stats
  turnovers: {
    home: {
      total: number
      forced: number
      unforced: number
      d1: number
      d2: number
      d3: number
      m1: number
      m2: number
      m3: number
      a1: number
      a2: number
      a3: number
    }
    away: {
      total: number
      forced: number
      unforced: number
      d1: number
      d2: number
      d3: number
      m1: number
      m2: number
      m3: number
      a1: number
      a2: number
      a3: number
    }
  }
  
  // Foul stats
  fouls: {
    home: {
      conceded: number
      scoreable: number
      awarded: number
    }
    away: {
      conceded: number
      scoreable: number
      awarded: number
    }
  }
}

/**
 * Parse XML string to extract all game events and statistics
 */
export function parseGAAXML(xmlString: string): XMLGameStats {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  
  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Failed to parse XML: ' + parseError.textContent)
  }
  
  const instances = xmlDoc.querySelectorAll('instance')
  const events: XMLEvent[] = []
  
  // Initialize stats
  const stats: XMLGameStats = {
    totalEvents: instances.length,
    eventsByCode: {},
    events: [],
    possession: {
      home: { count: 0, duration: 0 },
      away: { count: 0, duration: 0 },
    },
    shots: {
      home: { total: 0, goals: 0, points: 0, wides: 0, shortKeeper: 0, saved: 0, m45: 0, reboundPost: 0, other: 0, fromPlay: 0, fromFree: 0 },
      away: { total: 0, goals: 0, points: 0, wides: 0, shortKeeper: 0, saved: 0, m45: 0, reboundPost: 0, other: 0, fromPlay: 0, fromFree: 0 },
    },
    kickouts: {
      home: { total: 0, long: 0, short: 0, mid: 0, won: 0, lost: 0, left: 0, centre: 0, right: 0 },
      away: { total: 0, long: 0, short: 0, mid: 0, won: 0, lost: 0, left: 0, centre: 0, right: 0 },
    },
    turnovers: {
      home: { total: 0, forced: 0, unforced: 0, d1: 0, d2: 0, d3: 0, m1: 0, m2: 0, m3: 0, a1: 0, a2: 0, a3: 0 },
      away: { total: 0, forced: 0, unforced: 0, d1: 0, d2: 0, d3: 0, m1: 0, m2: 0, m3: 0, a1: 0, a2: 0, a3: 0 },
    },
    fouls: {
      home: { conceded: 0, scoreable: 0, awarded: 0 },
      away: { conceded: 0, scoreable: 0, awarded: 0 },
    },
  }
  
  // Parse each event instance
  instances.forEach((instance) => {
    const id = instance.querySelector('ID')?.textContent || ''
    const startRaw = instance.querySelector('start')?.textContent || '0'
    const endRaw = instance.querySelector('end')?.textContent || '0'
    const code = instance.querySelector('code')?.textContent || ''
    
    // Convert timestamps (stored as deciseconds in XML)
    const startTime = parseFloat(startRaw)
    const endTime = parseFloat(endRaw)
    const duration = endTime - startTime
    
    // Extract labels
    const labels: string[] = []
    instance.querySelectorAll('label text').forEach((label) => {
      const text = label.textContent?.trim()
      if (text) labels.push(text)
    })
    
    // Determine team (Own = home, Opp = away)
    let team: 'home' | 'away' | undefined
    if (code.includes('Own') || code.includes('own')) {
      team = 'home'
    } else if (code.includes('Opp') || code.includes('opp')) {
      team = 'away'
    }
    
    // Add to events array
    const event: XMLEvent = {
      id,
      startTime,
      endTime,
      code,
      labels,
      team,
    }
    events.push(event)
    
    // Count by code
    stats.eventsByCode[code] = (stats.eventsByCode[code] || 0) + 1
    
    // Process possession
    if (code.includes('Possession')) {
      if (code.includes('Own')) {
        stats.possession.home.count++
        stats.possession.home.duration += duration
      } else if (code.includes('Opp')) {
        stats.possession.away.count++
        stats.possession.away.duration += duration
      }
    }
    
    // Process shots
    if (code.includes('Shot')) {
      const teamStats = code.includes('Own') ? stats.shots.home : stats.shots.away
      teamStats.total++
      
      // Shot type
      if (labels.includes('From Play')) teamStats.fromPlay++
      if (labels.includes('From Free')) teamStats.fromFree++
      
      // Shot outcome
      if (labels.includes('Goal')) teamStats.goals++
      if (labels.includes('Point')) teamStats.points++
      if (labels.includes('Wide')) teamStats.wides++
      if (labels.includes('Short Keeper')) teamStats.shortKeeper++
      if (labels.includes('Saved')) teamStats.saved++
      if (labels.includes('45M')) teamStats.m45++
      if (labels.includes('Rebound Post')) teamStats.reboundPost++
      if (labels.includes('Pass / Other')) teamStats.other++
    }
    
    // Process kickouts
    if (code.includes('Kickout')) {
      const teamStats = code.includes('Own') ? stats.kickouts.home : stats.kickouts.away
      teamStats.total++
      
      // Distance
      if (labels.includes('Long')) teamStats.long++
      if (labels.includes('Short')) teamStats.short++
      if (labels.includes('Mid')) teamStats.mid++
      
      // Direction
      if (labels.includes('Left')) teamStats.left++
      if (labels.includes('Centre')) teamStats.centre++
      if (labels.includes('Right')) teamStats.right++
      
      // Outcome
      if (labels.includes('Won')) teamStats.won++
      if (labels.includes('Lost')) teamStats.lost++
    }
    
    // Process turnovers
    if (code.includes('Turnover')) {
      const isWon = code.includes('Won')
      const teamStats = isWon ? stats.turnovers.home : stats.turnovers.away
      teamStats.total++
      
      // Type
      if (labels.includes('Forced')) teamStats.forced++
      if (labels.includes('Unforced')) teamStats.unforced++
      
      // Zone
      if (labels.includes('D1')) teamStats.d1++
      if (labels.includes('D2')) teamStats.d2++
      if (labels.includes('D3')) teamStats.d3++
      if (labels.includes('M1')) teamStats.m1++
      if (labels.includes('M2')) teamStats.m2++
      if (labels.includes('M3')) teamStats.m3++
      if (labels.includes('A1')) teamStats.a1++
      if (labels.includes('A2')) teamStats.a2++
      if (labels.includes('A3')) teamStats.a3++
    }
    
    // Process fouls
    if (code.includes('Foul')) {
      if (code.includes('Conceded')) {
        stats.fouls.home.conceded++
        if (code.includes('Scoreable')) {
          stats.fouls.home.scoreable++
        }
      } else if (code.includes('Awarded')) {
        stats.fouls.home.awarded++
      }
    }
  })
  
  stats.events = events
  return stats
}

/**
 * Load and parse XML from a URL
 */
export async function loadXMLFromURL(url: string): Promise<XMLGameStats> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load XML: ${response.statusText}`)
  }
  const xmlString = await response.text()
  return parseGAAXML(xmlString)
}

