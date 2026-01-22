export interface PredictionResponse {
  predictionId: number;
  agentId: number;
  targetMarket: string;
  predictionDate: string;
  prediction: number[];
  actualMarket: number[];
}
