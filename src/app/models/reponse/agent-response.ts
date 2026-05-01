export enum AgentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface FeatureParameter {
  id: number;
  name: string;
  value: string;
  defaultValue: string;
  type: string;
  description?: string | null;
  required: boolean;
}

export interface AgentFeatureResponse {
  id: number;
  featureId: number;
  featureName: string;
  featureDescription: string | null;
  parameters: FeatureParameter[];
}

export interface AgentsPerUserResponse {
  id: number;
  name: string;
  trainingStatus: AgentStatus;
  agentFeatures: AgentFeatureResponse[];
}
