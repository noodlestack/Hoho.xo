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
    label: "Find free, confidential support",
    guidance:
      "If you are going through a difficult moment, please contact local emergency services or reach out to a verified local helpline.",
    url: "https://findahelpline.com",
  },
  regions: {
    PH: [
      {
        label: "NCMH Crisis Hotline (Philippines)",
        guidance:
          "Free 24/7 crisis support: call 1553 (Luzon) or 0917-899-8727.",
        tel: "1553",
        url: "https://ncmh.gov.ph",
      },
      {
        label: "Hopeline Philippines",
        guidance: "24/7 emotional crisis helpline: call 0917-558-4673.",
        tel: "09175584673",
      },
    ],
    US: [
      {
        label: "988 Suicide & Crisis Lifeline (US)",
        guidance: "Call or text 988 for free, confidential 24/7 support.",
        tel: "988",
        url: "https://988lifeline.org",
      },
    ],
    GB: [
      {
        label: "Samaritans (UK)",
        guidance: "Free 24/7 listening support: call 116 123.",
        tel: "116123",
        url: "https://www.samaritans.org",
      },
    ],
    AU: [
      {
        label: "Lifeline Australia",
        guidance: "24/7 crisis support: call 13 11 14.",
        tel: "131114",
        url: "https://www.lifeline.org.au",
      },
    ],
  },
};

export function getDefaultCrisisResource(): CrisisResource {
  return CRISIS_RESOURCES.default;
}
