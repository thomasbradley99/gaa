'use client'

import { useMemo } from 'react'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import type { GameEvent } from './video-player/types'

interface GameStatsProps {
  game: {
    id: string
    title: string
    team_name?: string
    created_at?: string
    status: string
  }
  events: GameEvent[]
  duration: number
  onEventsUploaded?: (events: GameEvent[]) => void
}

export function GameStats({ game, events, duration }: GameStatsProps) {
  const stats = useMemo(() => {
    // Extract unique teams from events
    const uniqueTeams = Array.from(new Set(events.map(e => e.team).filter(Boolean)))
    const team1 = uniqueTeams[0] || 'home'
    const team2 = uniqueTeams[1] || 'away'
    
    const homeEvents = events.filter((e) => e.team === team1)
    const awayEvents = events.filter((e) => e.team === team2)

    // Calculate possession (simplified - based on events)
    const totalPossessions = events.length
    const homePossessions = homeEvents.length
    const awayPossessions = awayEvents.length
    const possessionHome = totalPossessions > 0 ? Math.round((homePossessions / totalPossessions) * 100) : 0
    const possessionAway = totalPossessions > 0 ? Math.round((awayPossessions / totalPossessions) * 100) : 0

    // Shots - filter by action="Shot"
    const homeShots = homeEvents.filter((e) => e.action === 'Shot')
    const awayShots = awayEvents.filter((e) => e.action === 'Shot')
    
    const homeGoals = homeShots.filter((e) => e.outcome === 'Goal').length
    const homePoints = homeShots.filter((e) => e.outcome === 'Point').length
    const homeWides = homeShots.filter((e) => e.outcome === 'Wide').length
    const homeShortKeeper = homeShots.filter((e) => e.metadata?.scoreType === 'short_keeper' || e.metadata?.scoreType === 'short').length
    const homeSaved = homeShots.filter((e) => e.outcome === 'Saved').length
    const home45M = homeShots.filter((e) => e.metadata?.scoreType === '45m').length
    const homeReboundPost = homeShots.filter((e) => e.metadata?.scoreType === 'rebound_post').length
    const homeOther = homeShots.filter((e) => {
      const type = e.metadata?.scoreType
      return !type || (type !== 'goal' && type !== 'point' && type !== 'wide' && type !== 'short_keeper' && type !== 'short' && type !== 'saved' && type !== '45m' && type !== 'rebound_post')
    }).length
    
    const awayGoals = awayShots.filter((e) => e.outcome === 'Goal').length
    const awayPoints = awayShots.filter((e) => e.outcome === 'Point').length
    const awayWides = awayShots.filter((e) => e.outcome === 'Wide').length
    const awayShortKeeper = awayShots.filter((e) => e.metadata?.scoreType === 'short_keeper' || e.metadata?.scoreType === 'short').length
    const awaySaved = awayShots.filter((e) => e.outcome === 'Saved').length
    const away45M = awayShots.filter((e) => e.metadata?.scoreType === '45m').length
    const awayReboundPost = awayShots.filter((e) => e.metadata?.scoreType === 'rebound_post').length
    const awayOther = awayShots.filter((e) => {
      const type = e.metadata?.scoreType
      return !type || (type !== 'goal' && type !== 'point' && type !== 'wide' && type !== 'short_keeper' && type !== 'short' && type !== 'saved' && type !== '45m' && type !== 'rebound_post')
    }).length

    const homeScores = homeGoals + homePoints
    const awayScores = awayGoals + awayPoints
    const homeTotalShots = homeShots.length
    const awayTotalShots = awayShots.length
    
    const conversionRateHome = homeTotalShots > 0 ? Math.round((homeScores / homeTotalShots) * 100) : 0
    const conversionRateAway = awayTotalShots > 0 ? Math.round((awayScores / awayTotalShots) * 100) : 0

    // Kickouts
    const homeKickouts = homeEvents.filter((e) => e.action === 'Kickout')
    const awayKickouts = awayEvents.filter((e) => e.action === 'Kickout')
    
    // Home kickouts won (when home team wins their own kickout)
    const homeKickoutsWon = homeKickouts.filter((e) => e.metadata?.possessionOutcome === 'won').length
    const homeKickoutsLong = homeKickouts.filter((e) => e.metadata?.kickoutType === 'long' && e.metadata?.possessionOutcome === 'won').length
    const homeKickoutsShort = homeKickouts.filter((e) => e.metadata?.kickoutType === 'short' && e.metadata?.possessionOutcome === 'won').length
    const homeKickoutsMid = homeKickouts.filter((e) => e.metadata?.kickoutType === 'mid' && e.metadata?.possessionOutcome === 'won').length
    const homeKickoutsVoid = homeKickouts.filter((e) => e.metadata?.kickoutType === 'void' && e.metadata?.possessionOutcome === 'won').length
    
    // Away kickouts won (when away team wins their own kickout)
    const awayKickoutsWon = awayKickouts.filter((e) => e.metadata?.possessionOutcome === 'won').length
    const awayKickoutsLong = awayKickouts.filter((e) => e.metadata?.kickoutType === 'long' && e.metadata?.possessionOutcome === 'won').length
    const awayKickoutsShort = awayKickouts.filter((e) => e.metadata?.kickoutType === 'short' && e.metadata?.possessionOutcome === 'won').length
    const awayKickoutsMid = awayKickouts.filter((e) => e.metadata?.kickoutType === 'mid' && e.metadata?.possessionOutcome === 'won').length
    const awayKickoutsVoid = awayKickouts.filter((e) => e.metadata?.kickoutType === 'void' && e.metadata?.possessionOutcome === 'won').length

    // Opponent kickouts won (when team wins opponent's kickout)
    const homeOpponentKickoutsWon = awayKickouts.filter((e) => e.metadata?.possessionOutcome === 'lost').length
    const awayOpponentKickoutsWon = homeKickouts.filter((e) => e.metadata?.possessionOutcome === 'lost').length

    // Turnovers
    const homeTurnovers = homeEvents.filter((e) => e.action === 'Turnover')
    const awayTurnovers = awayEvents.filter((e) => e.action === 'Turnover')
    
    const homeTurnoversForced = homeTurnovers.filter((e) => e.metadata?.turnoverType === 'forced').length
    const homeTurnoversUnforced = homeTurnovers.filter((e) => e.metadata?.turnoverType === 'unforced').length
    const homeTurnoversTotal = homeTurnovers.length
    
    const awayTurnoversForced = awayTurnovers.filter((e) => e.metadata?.turnoverType === 'forced').length
    const awayTurnoversUnforced = awayTurnovers.filter((e) => e.metadata?.turnoverType === 'unforced').length
    const awayTurnoversTotal = awayTurnovers.length

    // Fouls
    const homeFouls = homeEvents.filter((e) => e.action === 'Foul')
    const awayFouls = awayEvents.filter((e) => e.action === 'Foul')
    const homeScorableFreesConceded = homeFouls.filter((e) => e.metadata?.foulType === 'scorable' || e.metadata?.scorable).length
    const awayScorableFreesConceded = awayFouls.filter((e) => e.metadata?.foulType === 'scorable' || e.metadata?.scorable).length

    // 45M Entries (entries into scoring zone)
    const home45MEntries = homeEvents.filter((e) => e.metadata?.zone === '45m' || e.metadata?.zone === 'attack').length
    const away45MEntries = awayEvents.filter((e) => e.metadata?.zone === '45m' || e.metadata?.zone === 'attack').length
    const home45MEntryRate = homePossessions > 0 ? Math.round((home45MEntries / homePossessions) * 100) : 0
    const away45MEntryRate = awayPossessions > 0 ? Math.round((away45MEntries / awayPossessions) * 100) : 0

    // Shot rate
    const homeShotRate = homePossessions > 0 ? Math.round((homeTotalShots / homePossessions) * 100) : 0
    const awayShotRate = awayPossessions > 0 ? Math.round((awayTotalShots / awayPossessions) * 100) : 0

    // Scores
    const homeScore = homeGoals * 3 + homePoints
    const awayScore = awayGoals * 3 + awayPoints

    return {
      home: {
        score: homeScore,
        goals: homeGoals,
        points: homePoints,
        totalScore: `${homeGoals} - ${homePoints}`,
        conversionRate: conversionRateHome,
        possession: possessionHome,
        possessions: homePossessions,
        shots: homeTotalShots,
        shotRate: homeShotRate,
        scores: homeScores,
        wides: homeWides,
        shortKeeper: homeShortKeeper,
        saved: homeSaved,
        m45: home45M,
        reboundPost: homeReboundPost,
        other: homeOther,
        kickoutsWon: homeKickoutsWon,
        opponentKickoutsWon: homeOpponentKickoutsWon,
        kickoutsLong: homeKickoutsLong,
        kickoutsShort: homeKickoutsShort,
        kickoutsMid: homeKickoutsMid,
        kickoutsVoid: homeKickoutsVoid,
        turnoversForced: homeTurnoversForced,
        turnoversUnforced: homeTurnoversUnforced,
        turnoversTotal: homeTurnoversTotal,
        scorableFreesConceded: homeScorableFreesConceded,
        m45Entries: home45MEntries,
        m45EntryRate: home45MEntryRate,
      },
      away: {
        score: awayScore,
        goals: awayGoals,
        points: awayPoints,
        totalScore: `${awayGoals} - ${awayPoints}`,
        conversionRate: conversionRateAway,
        possession: possessionAway,
        possessions: awayPossessions,
        shots: awayTotalShots,
        shotRate: awayShotRate,
        scores: awayScores,
        wides: awayWides,
        shortKeeper: awayShortKeeper,
        saved: awaySaved,
        m45: away45M,
        reboundPost: awayReboundPost,
        other: awayOther,
        kickoutsWon: awayKickoutsWon,
        opponentKickoutsWon: awayOpponentKickoutsWon,
        kickoutsLong: awayKickoutsLong,
        kickoutsShort: awayKickoutsShort,
        kickoutsMid: awayKickoutsMid,
        kickoutsVoid: awayKickoutsVoid,
        turnoversForced: awayTurnoversForced,
        turnoversUnforced: awayTurnoversUnforced,
        turnoversTotal: awayTurnoversTotal,
        scorableFreesConceded: awayScorableFreesConceded,
        m45Entries: away45MEntries,
        m45EntryRate: away45MEntryRate,
      },
    }
  }, [events])

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPos = 20

    // Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(game.title, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    // Score
    doc.setFontSize(16)
    const uniqueTeams = Array.from(new Set(events.map(e => e.team).filter(Boolean)))
    const team1Name = uniqueTeams[0]?.toUpperCase() || 'HOME'
    const team2Name = uniqueTeams[1]?.toUpperCase() || 'AWAY'
    doc.text(team1Name, 20, yPos)
    doc.text(`${stats.home.goals} - ${stats.home.points}`, 60, yPos)
    doc.text(team2Name, 120, yPos)
    doc.text(`${stats.away.goals} - ${stats.away.points}`, 160, yPos)
    yPos += 15

    // Main stats table
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('MATCH STATISTICS', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const statRows = [
      ['Conversion Rate %', `${stats.home.conversionRate}%`, `${stats.away.conversionRate}%`],
      ['Possession', `${stats.home.possession}%`, `${stats.away.possession}%`],
      ['Number of Team Possessions', stats.home.possessions.toString(), stats.away.possessions.toString()],
      ['45M Entries', `${stats.home.m45Entries} (${stats.home.m45EntryRate}%)`, `${stats.away.m45Entries} (${stats.away.m45EntryRate}%)`],
      ['Shots', `${stats.home.shots} (${stats.home.shotRate}%)`, `${stats.away.shots} (${stats.away.shotRate}%)`],
      ['Home Kickouts Won', stats.home.kickoutsWon.toString(), stats.away.opponentKickoutsWon.toString()],
      ['Away Kickouts Won', stats.home.opponentKickoutsWon.toString(), stats.away.kickoutsWon.toString()],
      ['Turnovers Won Forced', stats.home.turnoversForced.toString(), stats.away.turnoversForced.toString()],
      ['Turnovers Won Unforced', stats.home.turnoversUnforced.toString(), stats.away.turnoversUnforced.toString()],
      ['Turnovers Won Total', stats.home.turnoversTotal.toString(), stats.away.turnoversTotal.toString()],
      ['Scorable Frees Conceded', stats.home.scorableFreesConceded.toString(), stats.away.scorableFreesConceded.toString()],
    ]

    statRows.forEach(([label, home, away]) => {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }
      doc.text(label, 20, yPos)
      doc.text(home, 100, yPos)
      doc.text(away, 150, yPos)
      yPos += 7
    })

    // Kickout breakdowns
    yPos += 5
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.text('HOME KICKOUTS WON', 20, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.text('Long', 25, yPos)
    doc.text(`${stats.home.kickoutsLong}`, 100, yPos)
    doc.text(`${stats.away.kickoutsLong}`, 150, yPos)
    yPos += 6
    doc.text('Short', 25, yPos)
    doc.text(`${stats.home.kickoutsShort}`, 100, yPos)
    doc.text(`${stats.away.kickoutsShort}`, 150, yPos)
    yPos += 6
    doc.text('Mid', 25, yPos)
    doc.text(`${stats.home.kickoutsMid}`, 100, yPos)
    doc.text(`${stats.away.kickoutsMid}`, 150, yPos)
    yPos += 6
    doc.text('Void', 25, yPos)
    doc.text(`${stats.home.kickoutsVoid}`, 100, yPos)
    doc.text(`${stats.away.kickoutsVoid}`, 150, yPos)

    yPos += 10
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.text('AWAY KICKOUTS WON', 20, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.text('Long', 25, yPos)
    doc.text(`${stats.away.kickoutsLong}`, 100, yPos)
    doc.text(`${stats.home.kickoutsLong}`, 150, yPos)
    yPos += 6
    doc.text('Short', 25, yPos)
    doc.text(`${stats.away.kickoutsShort}`, 100, yPos)
    doc.text(`${stats.home.kickoutsShort}`, 150, yPos)
    yPos += 6
    doc.text('Mid', 25, yPos)
    doc.text(`${stats.away.kickoutsMid}`, 100, yPos)
    doc.text(`${stats.home.kickoutsMid}`, 150, yPos)
    yPos += 6
    doc.text('Void', 25, yPos)
    doc.text(`${stats.away.kickoutsVoid}`, 100, yPos)
    doc.text(`${stats.home.kickoutsVoid}`, 150, yPos)

    // Shot outcome breakdown
    yPos += 10
    if (yPos > pageHeight - 40) {
      doc.addPage()
      yPos = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.text('SHOT OUTCOME', 20, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    
    const shotOutcomes = [
      ['Scores', stats.home.scores.toString(), stats.away.scores.toString()],
      ['Wide', stats.home.wides.toString(), stats.away.wides.toString()],
      ['Short Keeper', stats.home.shortKeeper.toString(), stats.away.shortKeeper.toString()],
      ['Saved', stats.home.saved.toString(), stats.away.saved.toString()],
      ['45M', stats.home.m45.toString(), stats.away.m45.toString()],
      ['Rebound Post', stats.home.reboundPost.toString(), stats.away.reboundPost.toString()],
      ['Other', stats.home.other.toString(), stats.away.other.toString()],
    ]

    shotOutcomes.forEach(([outcome, home, away]) => {
      if (yPos > pageHeight - 15) {
        doc.addPage()
        yPos = 20
      }
      doc.text(outcome, 25, yPos)
      doc.text(home, 100, yPos)
      doc.text(away, 150, yPos)
      yPos += 6
    })

    const filename = `${game.title.replace(/[^a-z0-9]/gi, '_')}_stats.pdf`
    doc.save(filename)
  }

  return (
    <div className="bg-black/50 backdrop-blur-lg border border-white/10 rounded-2xl p-3 sm:p-6 shadow-xl">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-white">Match Statistics</h2>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white rounded-xl transition-colors text-xs sm:text-sm font-medium shadow-lg"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Export to PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {/* Score Display - Anadi Style */}
      <div className="flex items-center justify-center gap-4 sm:gap-16 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-gray-700">
        <div className="text-center">
          <div className="text-xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
            {(() => {
              const uniqueTeams = Array.from(new Set(events.map(e => e.team).filter(Boolean)))
              return uniqueTeams[0]?.toUpperCase() || 'HOME'
            })()}
          </div>
          <div className="text-2xl sm:text-5xl font-bold text-white">{stats.home.goals} - {stats.home.points}</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
            {(() => {
              const uniqueTeams = Array.from(new Set(events.map(e => e.team).filter(Boolean)))
              return uniqueTeams[1]?.toUpperCase() || 'AWAY'
            })()}
          </div>
          <div className="text-2xl sm:text-5xl font-bold text-white">{stats.away.goals} - {stats.away.points}</div>
        </div>
      </div>

      {/* Main Statistics Table */}
      <div className="space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
        <StatRow label="Conversion Rate %" home={`${stats.home.conversionRate}%`} away={`${stats.away.conversionRate}%`} />
        <StatRow label="Possession" home={`${stats.home.possession}%`} away={`${stats.away.possession}%`} />
        <StatRow label="Number of Team Possessions" home={stats.home.possessions.toString()} away={stats.away.possessions.toString()} />
        <StatRow 
          label="45M Entries" 
          home={`${stats.home.m45Entries} (${stats.home.m45EntryRate}%)`} 
          away={`${stats.away.m45Entries} (${stats.away.m45EntryRate}%)`} 
        />
        <StatRow 
          label="Shots" 
          home={`${stats.home.shots} (${stats.home.shotRate}%)`} 
          away={`${stats.away.shots} (${stats.away.shotRate}%)`} 
        />
        <StatRow label="Home Kickouts Won" home={stats.home.kickoutsWon.toString()} away={stats.away.opponentKickoutsWon.toString()} />
        <StatRow label="Away Kickouts Won" home={stats.home.opponentKickoutsWon.toString()} away={stats.away.kickoutsWon.toString()} />
        <StatRow label="Turnovers Won Forced" home={stats.home.turnoversForced.toString()} away={stats.away.turnoversForced.toString()} />
        <StatRow label="Turnovers Won Unforced" home={stats.home.turnoversUnforced.toString()} away={stats.away.turnoversUnforced.toString()} />
        <StatRow label="Turnovers Won Total" home={stats.home.turnoversTotal.toString()} away={stats.away.turnoversTotal.toString()} />
        <StatRow label="Scorable Frees Conceded" home={stats.home.scorableFreesConceded.toString()} away={stats.away.scorableFreesConceded.toString()} />
      </div>

      {/* Kickout Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <KickoutBreakdown 
          title="HOME KICKOUTS WON" 
          long={stats.home.kickoutsLong}
          short={stats.home.kickoutsShort}
          mid={stats.home.kickoutsMid}
          void={stats.home.kickoutsVoid}
          opponentLong={stats.away.kickoutsLong}
          opponentShort={stats.away.kickoutsShort}
          opponentMid={stats.away.kickoutsMid}
          opponentVoid={stats.away.kickoutsVoid}
          metricFirst={true}
        />
        <KickoutBreakdown 
          title="AWAY KICKOUTS WON" 
          long={stats.away.kickoutsLong}
          short={stats.away.kickoutsShort}
          mid={stats.away.kickoutsMid}
          void={stats.away.kickoutsVoid}
          opponentLong={stats.home.kickoutsLong}
          opponentShort={stats.home.kickoutsShort}
          opponentMid={stats.home.kickoutsMid}
          opponentVoid={stats.home.kickoutsVoid}
        />
      </div>

      {/* Shot Outcome Breakdown */}
      <div className="bg-gray-700 rounded-lg p-2.5 sm:p-4">
        <h3 className="text-[10px] sm:text-sm font-bold text-green-400 mb-2 sm:mb-3 uppercase tracking-wide text-center">SHOT OUTCOME</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.scores}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Scores</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.scores}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.wides}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Wide</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.wides}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.shortKeeper}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Short Keeper</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.shortKeeper}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.saved}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Saved</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.saved}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.m45}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">45M</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.m45}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.reboundPost}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Rebound Post</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.reboundPost}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.home.other}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Other</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.away.other}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, home, away }: { label: string; home: string; away: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3 py-1">
      {/* Home value - left side */}
      <div className="bg-gray-600 px-1.5 sm:px-3 py-1 sm:py-2 rounded text-white text-[10px] sm:text-sm font-medium min-w-[35px] sm:min-w-[60px] text-center">
        {home}
      </div>
      
      {/* Black bar with stat name - stretches across middle */}
      <div className="flex-1 bg-black px-2 sm:px-4 py-1 sm:py-2 rounded min-w-0">
        <div className="text-white text-[9px] sm:text-sm font-medium text-center uppercase tracking-wide truncate">
          {label}
        </div>
      </div>
      
      {/* Away value - right side */}
      <div className="bg-gray-600 px-1.5 sm:px-3 py-1 sm:py-2 rounded text-white text-[10px] sm:text-sm font-medium min-w-[35px] sm:min-w-[60px] text-center">
        {away}
      </div>
    </div>
  )
}

function KickoutBreakdown({ 
  title, 
  long, short, mid, void: voidCount,
  opponentLong, opponentShort, opponentMid, opponentVoid,
  metricFirst = false
}: { 
  title: string
  long: number
  short: number
  mid: number
  void: number
  opponentLong: number
  opponentShort: number
  opponentMid: number
  opponentVoid: number
  metricFirst?: boolean
}) {
  const renderRow = (label: string, value: number) => {
    if (metricFirst) {
      // Metric first, then description
      return (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{value}</div>
          <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">{label}</div>
        </div>
      )
    } else {
      // Description first, then metric
      return (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">{label}</div>
          <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{value}</div>
        </div>
      )
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-2.5 sm:p-4">
      <h3 className="text-[10px] sm:text-sm font-bold text-green-400 mb-2 sm:mb-3 uppercase tracking-wide text-center">{title}</h3>
      <div className="space-y-1">
        {renderRow('Long', long)}
        {renderRow('Short', short)}
        {renderRow('Mid', mid)}
        {renderRow('Void', voidCount)}
      </div>
    </div>
  )
}

