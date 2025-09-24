// Stub implementation for new crawlAll to resolve import error.
// Replace with real implementation when ready.

export const crawlAll = async (
  _config: any,
  _options: { sessionId: string; resumeEnabled: boolean; progressReporting: boolean }
): Promise<{ success: boolean; totalProcessingTime: number; summary: any }> => {
  // Stub: immediately return unsuccessful result
  return {
    success: false,
    totalProcessingTime: 0,
    summary: { errors: ["Not implemented"], details: null },
  };
};
