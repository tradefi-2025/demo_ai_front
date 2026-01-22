export enum AgentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface FeatureParameter {
  id: number;
  name: string;
  value: string;
  defaultValue: string;
  type: string;
  required: boolean;
}

export interface AgentFeatureResponse {
  id: number;
  featureId: number;
  featureName: string;
  featureDescription: string;
  parameters: FeatureParameter[];
}

export interface AgentsPerUserResponse {
  id: number;
  name: string;
  targetMarket: string;
  inputStartTime: string;
  inputEndTime: string;
  inputFrequency: number;
  outputStartTime: string;
  outputEndTime: string;
  outputFrequency: number;
  predictionScale: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  frequency: string;
  trainingStatus: AgentStatus;
  agentFeatures: AgentFeatureResponse[];
}
