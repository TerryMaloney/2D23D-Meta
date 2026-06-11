export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
  /** Ordered list instead of bullets. */
  ordered?: boolean;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** Approximate reading time, minutes. */
  minutes: number;
  updated: string; // ISO date
  sections: GuideSection[];
}
