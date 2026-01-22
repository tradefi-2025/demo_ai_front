export interface AgentFormDTO {
    name: string;
    targetMarket: string;
    inputStartTime: number;
    inputEndTime: number;
    outputStartTime: number;
    outputEndTime: number;
    frequency: string;
    predictionScale: string;
    features: {
      [featureName: string]: {
        [paramName: string]: string;
      }
    }
}
