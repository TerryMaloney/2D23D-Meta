import type { BankTemplate } from "../template-engine";

import amexCard from "./amex-card-v1.json";
import boaChecking from "./boa-checking-v1.json";
import capitaloneCard from "./capitalone-card-v1.json";
import chaseCard from "./chase-card-v1.json";
import chaseChecking from "./chase-checking-v1.json";
import citiCard from "./citi-card-v1.json";
import paypalActivity from "./paypal-activity-v1.json";
import usbankChecking from "./usbank-checking-v1.json";
import wellsfargoChecking from "./wellsfargo-checking-v1.json";
import wise from "./wise-v1.json";

export const TEMPLATES: BankTemplate[] = [
  chaseChecking,
  chaseCard,
  boaChecking,
  wellsfargoChecking,
  citiCard,
  capitaloneCard,
  amexCard,
  usbankChecking,
  paypalActivity,
  wise,
] as BankTemplate[];
