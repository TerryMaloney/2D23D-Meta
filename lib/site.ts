export const SITE_URL = "https://statementclear.com";
export const SITE_NAME = "StatementClear";
export const SUPPORT_EMAIL = "support@statementclear.com";

/** Free plan: full parsing and preview always; export capped per file. */
export const FREE_EXPORT_CAP = 30;

export const PRICING = {
  creditPack: { price: "$12", credits: 15 },
  proMonthly: { price: "$24" },
  proYearly: { price: "$149" },
} as const;
