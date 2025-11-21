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
  // Get unique team names from events
  const teamNames = useMemo(() => {
    const teams = new Set<string>()
    events.forEach(event => {
      if (event.team) teams.add(event.team)
    })
    const teamArray = Array.from(teams)
    return teamArray.length >= 2 ? [teamArray[0], teamArray[1]] : (teamArray.length === 1 ? [teamArray[0], 'Away'] : ['Home', 'Away'])
  }, [events])
  
  const stats = useMemo(() => {
    const team1Name = teamNames[0] || 'Home'
    const team2Name = teamNames[1] || 'Away'
    const team1Events = events.filter((e) => e.team === team1Name)
    const team2Events = events.filter((e) => e.team === team2Name)

    // Calculate possession (simplified - based on events)
    const totalPossessions = events.length
    const team1Possessions = team1Events.length
    const team2Possessions = team2Events.length
    const possessionTeam1 = totalPossessions > 0 ? Math.round((team1Possessions / totalPossessions) * 100) : 0
    const possessionTeam2 = totalPossessions > 0 ? Math.round((team2Possessions / totalPossessions) * 100) : 0

    // Shots - filter by action="Shot"
    const team1Shots = team1Events.filter((e) => e.action === 'Shot')
    const team2Shots = team2Events.filter((e) => e.action === 'Shot')
    
    const team1Goals = team1Shots.filter((e) => e.outcome === 'Goal').length
    const team1Points = team1Shots.filter((e) => e.outcome === 'Point').length
    const team1Wides = team1Shots.filter((e) => e.outcome === 'Wide').length
    const team1ShortKeeper = team1Shots.filter((e) => e.metadata?.scoreType === 'short_keeper' || e.metadata?.scoreType === 'short').length
    const team1Saved = team1Shots.filter((e) => e.outcome === 'Saved').length
    const team145M = team1Shots.filter((e) => e.metadata?.scoreType === '45m').length
    const team1ReboundPost = team1Shots.filter((e) => e.metadata?.scoreType === 'rebound_post').length
    const team1Other = team1Shots.filter((e) => {
      const type = e.metadata?.scoreType
      return !type || (type !== 'goal' && type !== 'point' && type !== 'wide' && type !== 'short_keeper' && type !== 'short' && type !== 'saved' && type !== '45m' && type !== 'rebound_post')
    }).length
    
    const team2Goals = team2Shots.filter((e) => e.outcome === 'Goal').length
    const team2Points = team2Shots.filter((e) => e.outcome === 'Point').length
    const team2Wides = team2Shots.filter((e) => e.outcome === 'Wide').length
    const team2ShortKeeper = team2Shots.filter((e) => e.metadata?.scoreType === 'short_keeper' || e.metadata?.scoreType === 'short').length
    const team2Saved = team2Shots.filter((e) => e.outcome === 'Saved').length
    const team245M = team2Shots.filter((e) => e.metadata?.scoreType === '45m').length
    const team2ReboundPost = team2Shots.filter((e) => e.metadata?.scoreType === 'rebound_post').length
    const team2Other = team2Shots.filter((e) => {
      const type = e.metadata?.scoreType
      return !type || (type !== 'goal' && type !== 'point' && type !== 'wide' && type !== 'short_keeper' && type !== 'short' && type !== 'saved' && type !== '45m' && type !== 'rebound_post')
    }).length

    const team1Scores = team1Goals + team1Points
    const team2Scores = team2Goals + team2Points
    const team1TotalShots = team1Shots.length
    const team2TotalShots = team2Shots.length
    
    const conversionRateTeam1 = team1TotalShots > 0 ? Math.round((team1Scores / team1TotalShots) * 100) : 0
    const conversionRateTeam2 = team2TotalShots > 0 ? Math.round((team2Scores / team2TotalShots) * 100) : 0

    // Kickouts
    const team1Kickouts = team1Events.filter((e) => e.action === 'Kickout')
    const team2Kickouts = team2Events.filter((e) => e.action === 'Kickout')
    
    // Team1 kickouts won
    const team1KickoutsWon = team1Kickouts.filter((e) => e.metadata?.possessionOutcome === 'won').length
    const team1KickoutsLong = team1Kickouts.filter((e) => e.metadata?.kickoutType === 'long' && e.metadata?.possessionOutcome === 'won').length
    const team1KickoutsShort = team1Kickouts.filter((e) => e.metadata?.kickoutType === 'short' && e.metadata?.possessionOutcome === 'won').length
    const team1KickoutsMid = team1Kickouts.filter((e) => e.metadata?.kickoutType === 'mid' && e.metadata?.possessionOutcome === 'won').length
    const team1KickoutsVoid = team1Kickouts.filter((e) => e.metadata?.kickoutType === 'void' && e.metadata?.possessionOutcome === 'won').length
    
    // Team2 kickouts won
    const team2KickoutsWon = team2Kickouts.filter((e) => e.metadata?.possessionOutcome === 'won').length
    const team2KickoutsLong = team2Kickouts.filter((e) => e.metadata?.kickoutType === 'long' && e.metadata?.possessionOutcome === 'won').length
    const team2KickoutsShort = team2Kickouts.filter((e) => e.metadata?.kickoutType === 'short' && e.metadata?.possessionOutcome === 'won').length
    const team2KickoutsMid = team2Kickouts.filter((e) => e.metadata?.kickoutType === 'mid' && e.metadata?.possessionOutcome === 'won').length
    const team2KickoutsVoid = team2Kickouts.filter((e) => e.metadata?.kickoutType === 'void' && e.metadata?.possessionOutcome === 'won').length

    // Opponent kickouts won
    const team1OpponentKickoutsWon = team2Kickouts.filter((e) => e.metadata?.possessionOutcome === 'lost').length
    const team2OpponentKickoutsWon = team1Kickouts.filter((e) => e.metadata?.possessionOutcome === 'lost').length

    // Turnovers
    const team1Turnovers = team1Events.filter((e) => e.action === 'Turnover')
    const team2Turnovers = team2Events.filter((e) => e.action === 'Turnover')
    
    const team1TurnoversForced = team1Turnovers.filter((e) => e.metadata?.turnoverType === 'forced').length
    const team1TurnoversUnforced = team1Turnovers.filter((e) => e.metadata?.turnoverType === 'unforced').length
    const team1TurnoversTotal = team1Turnovers.length
    
    const team2TurnoversForced = team2Turnovers.filter((e) => e.metadata?.turnoverType === 'forced').length
    const team2TurnoversUnforced = team2Turnovers.filter((e) => e.metadata?.turnoverType === 'unforced').length
    const team2TurnoversTotal = team2Turnovers.length

    // Fouls
    const team1Fouls = team1Events.filter((e) => e.action === 'Foul')
    const team2Fouls = team2Events.filter((e) => e.action === 'Foul')
    const team1ScorableFreesConceded = team1Fouls.filter((e) => e.metadata?.foulType === 'scorable' || e.metadata?.scorable).length
    const team2ScorableFreesConceded = team2Fouls.filter((e) => e.metadata?.foulType === 'scorable' || e.metadata?.scorable).length

    // 45M Entries
    const team145MEntries = team1Events.filter((e) => e.metadata?.zone === '45m' || e.metadata?.zone === 'attack').length
    const team245MEntries = team2Events.filter((e) => e.metadata?.zone === '45m' || e.metadata?.zone === 'attack').length
    const team145MEntryRate = team1Possessions > 0 ? Math.round((team145MEntries / team1Possessions) * 100) : 0
    const team245MEntryRate = team2Possessions > 0 ? Math.round((team245MEntries / team2Possessions) * 100) : 0

    // Shot rate
    const team1ShotRate = team1Possessions > 0 ? Math.round((team1TotalShots / team1Possessions) * 100) : 0
    const team2ShotRate = team2Possessions > 0 ? Math.round((team2TotalShots / team2Possessions) * 100) : 0

    // Scores
    const team1Score = team1Goals * 3 + team1Points
    const team2Score = team2Goals * 3 + team2Points

    return {
      team1: {
        name: team1Name,
        score: team1Score,
        goals: team1Goals,
        points: team1Points,
        totalScore: `${team1Goals} - ${team1Points}`,
        conversionRate: conversionRateTeam1,
        possession: possessionTeam1,
        possessions: team1Possessions,
        shots: team1TotalShots,
        shotRate: team1ShotRate,
        scores: team1Scores,
        wides: team1Wides,
        shortKeeper: team1ShortKeeper,
        saved: team1Saved,
        m45: team145M,
        reboundPost: team1ReboundPost,
        other: team1Other,
        kickoutsWon: team1KickoutsWon,
        opponentKickoutsWon: team1OpponentKickoutsWon,
        kickoutsLong: team1KickoutsLong,
        kickoutsShort: team1KickoutsShort,
        kickoutsMid: team1KickoutsMid,
        kickoutsVoid: team1KickoutsVoid,
        turnoversForced: team1TurnoversForced,
        turnoversUnforced: team1TurnoversUnforced,
        turnoversTotal: team1TurnoversTotal,
        scorableFreesConceded: team1ScorableFreesConceded,
        m45Entries: team145MEntries,
        m45EntryRate: team145MEntryRate,
      },
      team2: {
        name: team2Name,
        score: team2Score,
        goals: team2Goals,
        points: team2Points,
        totalScore: `${team2Goals} - ${team2Points}`,
        conversionRate: conversionRateTeam2,
        possession: possessionTeam2,
        possessions: team2Possessions,
        shots: team2TotalShots,
        shotRate: team2ShotRate,
        scores: team2Scores,
        wides: team2Wides,
        shortKeeper: team2ShortKeeper,
        saved: team2Saved,
        m45: team245M,
        reboundPost: team2ReboundPost,
        other: team2Other,
        kickoutsWon: team2KickoutsWon,
        opponentKickoutsWon: team2OpponentKickoutsWon,
        kickoutsLong: team2KickoutsLong,
        kickoutsShort: team2KickoutsShort,
        kickoutsMid: team2KickoutsMid,
        kickoutsVoid: team2KickoutsVoid,
        turnoversForced: team2TurnoversForced,
        turnoversUnforced: team2TurnoversUnforced,
        turnoversTotal: team2TurnoversTotal,
        scorableFreesConceded: team2ScorableFreesConceded,
        m45Entries: team245MEntries,
        m45EntryRate: team245MEntryRate,
      },
    }
  }, [events, duration, teamNames])

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
    doc.text(stats.team1.name, 20, yPos)
    doc.text(`${stats.team1.goals} - ${stats.team1.points}`, 60, yPos)
    doc.text(stats.team2.name, 120, yPos)
    doc.text(`${stats.team2.goals} - ${stats.team2.points}`, 160, yPos)
    yPos += 15

    // Main stats table
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('MATCH STATISTICS', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const statRows = [
      ['Conversion Rate %', `${stats.team1.conversionRate}%`, `${stats.team2.conversionRate}%`],
      ['Possession', `${stats.team1.possession}%`, `${stats.team2.possession}%`],
      ['Number of Team Possessions', stats.team1.possessions.toString(), stats.team2.possessions.toString()],
      ['45M Entries', `${stats.team1.m45Entries} (${stats.team1.m45EntryRate}%)`, `${stats.team2.m45Entries} (${stats.team2.m45EntryRate}%)`],
      ['Shots', `${stats.team1.shots} (${stats.team1.shotRate}%)`, `${stats.team2.shots} (${stats.team2.shotRate}%)`],
      [`${stats.team1.name} Kickouts Won`, stats.team1.kickoutsWon.toString(), stats.team2.opponentKickoutsWon.toString()],
      [`${stats.team2.name} Kickouts Won`, stats.team1.opponentKickoutsWon.toString(), stats.team2.kickoutsWon.toString()],
      ['Turnovers Won Forced', stats.team1.turnoversForced.toString(), stats.team2.turnoversForced.toString()],
      ['Turnovers Won Unforced', stats.team1.turnoversUnforced.toString(), stats.team2.turnoversUnforced.toString()],
      ['Turnovers Won Total', stats.team1.turnoversTotal.toString(), stats.team2.turnoversTotal.toString()],
      ['Scorable Frees Conceded', stats.team1.scorableFreesConceded.toString(), stats.team2.scorableFreesConceded.toString()],
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
    doc.text(`${stats.team1.name} KICKOUTS WON`, 20, yPos)
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.text('Long', 25, yPos)
    doc.text(`${stats.team1.kickoutsLong}`, 100, yPos)
    doc.text(`${stats.team2.kickoutsLong}`, 150, yPos)
    yPos += 6
    doc.text('Short', 25, yPos)
    doc.text(`${stats.team1.kickoutsShort}`, 100, yPos)
    doc.text(`${stats.team2.kickoutsShort}`, 150, yPos)
    yPos += 6
    doc.text('Mid', 25, yPos)
    doc.text(`${stats.team1.kickoutsMid}`, 100, yPos)
    doc.text(`${stats.team2.kickoutsMid}`, 150, yPos)
    yPos += 6
    doc.text('Void', 25, yPos)
    doc.text(`${stats.team1.kickoutsVoid}`, 100, yPos)
    doc.text(`${stats.team2.kickoutsVoid}`, 150, yPos)

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
    doc.text(`${stats.team2.kickoutsLong}`, 100, yPos)
    doc.text(`${stats.team1.kickoutsLong}`, 150, yPos)
    yPos += 6
    doc.text('Short', 25, yPos)
    doc.text(`${stats.team2.kickoutsShort}`, 100, yPos)
    doc.text(`${stats.team1.kickoutsShort}`, 150, yPos)
    yPos += 6
    doc.text('Mid', 25, yPos)
    doc.text(`${stats.team2.kickoutsMid}`, 100, yPos)
    doc.text(`${stats.team1.kickoutsMid}`, 150, yPos)
    yPos += 6
    doc.text('Void', 25, yPos)
    doc.text(`${stats.team2.kickoutsVoid}`, 100, yPos)
    doc.text(`${stats.team1.kickoutsVoid}`, 150, yPos)

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
      ['Scores', stats.team1.scores.toString(), stats.team2.scores.toString()],
      ['Wide', stats.team1.wides.toString(), stats.team2.wides.toString()],
      ['Short Keeper', stats.team1.shortKeeper.toString(), stats.team2.shortKeeper.toString()],
      ['Saved', stats.team1.saved.toString(), stats.team2.saved.toString()],
      ['45M', stats.team1.m45.toString(), stats.team2.m45.toString()],
      ['Rebound Post', stats.team1.reboundPost.toString(), stats.team2.reboundPost.toString()],
      ['Other', stats.team1.other.toString(), stats.team2.other.toString()],
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
          <div className="text-xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">{stats.team1.name}</div>
          <div className="text-2xl sm:text-5xl font-bold text-white">{stats.team1.goals} - {stats.team1.points}</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">{stats.team2.name}</div>
          <div className="text-2xl sm:text-5xl font-bold text-white">{stats.team2.goals} - {stats.team2.points}</div>
        </div>
      </div>

      {/* Main Statistics Table */}
      <div className="space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
        <StatRow label="Conversion Rate %" home={`${stats.team1.conversionRate}%`} away={`${stats.team2.conversionRate}%`} />
        <StatRow label="Possession" home={`${stats.team1.possession}%`} away={`${stats.team2.possession}%`} />
        <StatRow label="Number of Team Possessions" home={stats.team1.possessions.toString()} away={stats.team2.possessions.toString()} />
        <StatRow 
          label="45M Entries" 
          home={`${stats.team1.m45Entries} (${stats.team1.m45EntryRate}%)`} 
          away={`${stats.team2.m45Entries} (${stats.team2.m45EntryRate}%)`} 
        />
        <StatRow 
          label="Shots" 
          home={`${stats.team1.shots} (${stats.team1.shotRate}%)`} 
          away={`${stats.team2.shots} (${stats.team2.shotRate}%)`} 
        />
        <StatRow label={`${stats.team1.name} Kickouts Won`} home={stats.team1.kickoutsWon.toString()} away={stats.team2.opponentKickoutsWon.toString()} />
        <StatRow label={`${stats.team2.name} Kickouts Won`} home={stats.team1.opponentKickoutsWon.toString()} away={stats.team2.kickoutsWon.toString()} />
        <StatRow label="Turnovers Won Forced" home={stats.team1.turnoversForced.toString()} away={stats.team2.turnoversForced.toString()} />
        <StatRow label="Turnovers Won Unforced" home={stats.team1.turnoversUnforced.toString()} away={stats.team2.turnoversUnforced.toString()} />
        <StatRow label="Turnovers Won Total" home={stats.team1.turnoversTotal.toString()} away={stats.team2.turnoversTotal.toString()} />
        <StatRow label="Scorable Frees Conceded" home={stats.team1.scorableFreesConceded.toString()} away={stats.team2.scorableFreesConceded.toString()} />
      </div>

      {/* Kickout Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <KickoutBreakdown 
          title={`${stats.team1.name} KICKOUTS WON`} 
          long={stats.team1.kickoutsLong}
          short={stats.team1.kickoutsShort}
          mid={stats.team1.kickoutsMid}
          void={stats.team1.kickoutsVoid}
          opponentLong={stats.team2.kickoutsLong}
          opponentShort={stats.team2.kickoutsShort}
          opponentMid={stats.team2.kickoutsMid}
          opponentVoid={stats.team2.kickoutsVoid}
          metricFirst={true}
        />
        <KickoutBreakdown 
          title={`${stats.team2.name} KICKOUTS WON`} 
          long={stats.team2.kickoutsLong}
          short={stats.team2.kickoutsShort}
          mid={stats.team2.kickoutsMid}
          void={stats.team2.kickoutsVoid}
          opponentLong={stats.team1.kickoutsLong}
          opponentShort={stats.team1.kickoutsShort}
          opponentMid={stats.team1.kickoutsMid}
          opponentVoid={stats.team1.kickoutsVoid}
        />
      </div>

      {/* Shot Outcome Breakdown */}
      <div className="bg-gray-700 rounded-lg p-2.5 sm:p-4">
        <h3 className="text-[10px] sm:text-sm font-bold text-green-400 mb-2 sm:mb-3 uppercase tracking-wide text-center">SHOT OUTCOME</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.scores}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Scores</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.scores}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.wides}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Wide</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.wides}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.shortKeeper}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Short Keeper</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.shortKeeper}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.saved}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Saved</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.saved}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.m45}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">45M</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.m45}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.reboundPost}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Rebound Post</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.reboundPost}</div>
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team1.other}</div>
            <div className="flex-1 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs text-center uppercase">Other</div>
            <div className="bg-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs font-medium min-w-[28px] sm:min-w-[40px] text-center">{stats.team2.other}</div>
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

