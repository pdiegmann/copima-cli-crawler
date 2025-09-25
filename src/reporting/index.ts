// Progress reporting types

export type ProgressState = Record<string, unknown>;

export type ResourceCount = {
  total: number;
  processed: number;
  filtered: number;
  errors: number;
};

export type PerformanceMetrics = {
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
};

export type ProgressStats = {
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  startTime: Date;
  lastUpdate: Date;
  resourceCounts?: Record<string, ResourceCount>;
  performance?: PerformanceMetrics;
};
