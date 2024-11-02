import { CurrencyEuroIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

import {
  AppraisersReportIcon,
  AtTheAppraiserIcon,
  DecisionIcon,
  LegalAidIcon,
  SessionIcon,
  SettledIcon,
  WrittenPreliminaryProcedureIcon,
} from './Icons';

export const statusMap = {
  UNKNOWN: QuestionMarkCircleIcon,
  LEGAL_AID: LegalAidIcon,
  ADVANCE_PAYMENT_PENDING: CurrencyEuroIcon,
  WRITTEN_PRELIMINARY_PROCEDURE: WrittenPreliminaryProcedureIcon,
  AT_THE_APPRAISER: AtTheAppraiserIcon,
  APPRAISERS_REPORT: AppraisersReportIcon,
  SESSION: SessionIcon,
  DECISION: DecisionIcon,
  SETTLED: SettledIcon,
};

export const statusKeys = Object.keys(statusMap);

export const statusLabels = {
  UNKNOWN: 'Unbekannt',
  LEGAL_AID: 'PKH-Antrag offen',
  ADVANCE_PAYMENT_PENDING: 'Kostenvorschuss ausstehend',
  WRITTEN_PRELIMINARY_PROCEDURE: 'Schriftliches Vorverfahren',
  AT_THE_APPRAISER: 'Beim Sachverständigen / beim OLG',
  APPRAISERS_REPORT: 'Gutachten liegt vor',
  SESSION: 'Verhandlung terminiert',
  DECISION: 'Verkündungstermin',
  SETTLED: 'Erledigt',
};
