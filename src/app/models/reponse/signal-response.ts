export type SignalStatus = 'NEW' | 'READ' | 'ARCHIVED';

export interface SignalProbabilities {
  sell: number | null;
  hold: number | null;
  buy: number | null;
}

export interface Signal {
  signalId: number;
  agentId: number;
  agentName: string;
  signalDate: string;
  estimatedAction: string | null;
  signal: string | null;
  probability: number | null;
  probabilities: SignalProbabilities | null;
  volume: number | null;
  notional: number | null;
  stopLossPrice: number | null;
  riskAmount: number | null;
  sizingMethod: string | null;
  warnings: string[] | null;
  status: SignalStatus;
}

export interface UpdateSignalStatusRequest {
  status: SignalStatus;
}
