export interface AgentFormDTO {
    username: string;
    agentName: string;
    email: string;
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