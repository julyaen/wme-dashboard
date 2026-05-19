export type WaveState = 'Green' | 'Red'

export interface MarketBar {
  Date: string
  Time: string
  'Time Bucket': string
  Open: number
  High: number
  Low: number
  Last: number
  Volume: number
  'Bid Volume': number
  'Ask Volume': number
  'ASK>1050': number
  'BID<950': number
  'BID>1050': number
  'ASK<950': number
  '2kFL': number
  '2kNL': number
  EMA8: number
  '2mFL': number
  '2mNL': number
  '30mFL': number
  '30mNL': number
  '30mEMA8': number
  '30m CentreLine': number
  '30sFL': number
  '30sNL': number
  '2kWCL': number
  VWAP: number
  TB1: number
  BB1: number
  TB2: number
  BB2: number
  TB3: number
  BB3: number
  DWbid: number
  DWask: number
  '2000Vol Wave Range': number
  '2m WaveRange': number
  '2kEMA8 vs 2kWCL': number
  '2kEMA8 vs 2mWCL': number
  '2kWCL vs 2mWCL': number
  '30mWave': WaveState
  '2mWave': WaveState
  '30sWave': WaveState
  '2kWave': WaveState
  'RawASK-BID': number
  RawAsk: number
  RawBid: number
  'Net DWSkew': number
  'BID%': number
  'ASK%': number
  'Delta%': number
  E8_2kCL: number
  E8_2mCL: number
  '2mCL': number
  BullishDSS: number
  BearishDSS: number
  wBID: number
  wASK: number
  vwap_TB1: number
  'asDSS>70': number
  'biDSS>70': number
}

export interface Trade {
  id: string
  Symbol: string
  Note: string
  Setup: string
  'Trade Type': 'Long' | 'Short'
  'Entry DateTime': string
  'Exit DateTime': string
  Duration: number
  'Entry Price': number
  'Exit Price': number
  'Low Price While Open': number
  'High Price While Open': number
  'Trade Quantity': number
  'Profit/Loss (C)': number
  'Net PnL': number
  'Max Open Profit (C)': number
  'Max Open Loss (C)': number
  'Commission (C)': number
  'Cumulative Profit/Loss (C)': number
  Account: string
  'Entry >VWAP': string
  'Entry >TB1': string
  'Entry >TB2': string
  'Entry >TB3': string
  'Entry <BB1': string
  'Entry <BB2': string
  'Entry <BB3': string
  market: MarketBar
}

export interface DailyStats {
  date: string
  trades: number
  wins: number
  losses: number
  netPnL: number
  winRate: number
}

export interface SetupStats {
  name: string
  trades: number
  wins: number
  losses: number
  netPnL: number
  avgPnL: number
  avgMFE: number
  avgMAE: number
  winRate: number
}

export interface WaveStats {
  wave: string
  state: WaveState
  trades: number
  wins: number
  netPnL: number
  winRate: number
}

export interface BucketStats {
  bucket: string
  trades: number
  wins: number
  netPnL: number
  avgPnL: number
  winRate: number
}

export interface SessionStats {
  session: string
  trades: number
  wins: number
  netPnL: number
  winRate: number
  avgPnL: number
}

export interface DashboardStats {
  totalTrades: number
  winners: number
  losers: number
  netPnL: number
  winRate: number
  avgWinner: number
  avgLoser: number
  profitFactor: number
  expectancy: number
  totalCommission: number
  bestDay: DailyStats
  worstDay: DailyStats
  equityCurve: { trade: number; cumPnL: number }[]
  dailyPnL: DailyStats[]
  setupStats: SetupStats[]
  waveStats: WaveStats[]
  timeBuckets: BucketStats[]
  e8kBuckets: BucketStats[]
  e8mBuckets: BucketStats[]
  deltaBuckets: BucketStats[]
  weeklyPnL: { week: string; netPnL: number; trades: number; wins: number; winRate: number }[]
  monthlyPnL: { month: string; netPnL: number; trades: number; wins: number; winRate: number }[]
  longestWinStreak: number
  longestLossStreak: number
  bestSetup: SetupStats | null
  worstSetup: SetupStats | null
  longStats: { trades: number; wins: number; netPnL: number; winRate: number }
  shortStats: { trades: number; wins: number; netPnL: number; winRate: number }
  calendarData: Record<string, { netPnL: number; trades: number; wins: number }>
  drawdownCurve: { trade: number; cumPnL: number; drawdown: number; runningMax: number }[]
  maxDrawdown: number
  maxRunup: number
  rollingExpectancy: { trade: number; value: number | null }[]
  weekdayStats: { day: string; trades: number; wins: number; netPnL: number; winRate: number }[]
  // Risk metrics
  sharpe: number
  sortino: number
  calmar: number
  recoveryFactor: number
  avgDailyReturn: number
  stdDevDaily: number
  avgMFECapture: number
  // Session
  sessionStats: SessionStats[]
}
