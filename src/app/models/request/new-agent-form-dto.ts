export interface AgentFormDTO {
    agentName: string;
    targetMarket: string;
    inputStartTime: string;
    inputEndTime: string;
    inputFrequency: string;
    outputStartTime: string;
    outputEndTime: string;
    outputFrequency: string;
    features: {
      [featureName: string]: {
        [paramName: string]: string;
      }
    }
}