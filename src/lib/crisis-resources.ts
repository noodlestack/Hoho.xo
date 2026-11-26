export interface CrisisResource {
  label: string;
  guidance: string;
  url?: string;
  tel?: string;
}

export const CRISIS_RESOURCES: {
  default: CrisisResource;
  regions: Record<string, CrisisResource[]>;
} = {
  default: {
    label: "Support is available",
    guidance:
      "If you are going through a difficult moment, please contact local emergency services or reach out to someone you trust.",
  },
  regions: {
    // MAINTAINER: verify and fill region/country-specific support entries
  },
};

export function getDefaultCrisisResource(): CrisisResource {
  return CRISIS_RESOURCES.default;
}
