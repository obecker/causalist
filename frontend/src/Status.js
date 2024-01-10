import {CalendarDaysIcon, CurrencyEuroIcon, QuestionMarkCircleIcon} from "@heroicons/react/24/solid";
import React from "react";
import {
    AppraisersReportIcon,
    AtTheAppraiserIcon,
    DecisionIcon,
    OrderForEvidenceIcon,
    SessionIcon,
    SettledIcon,
    WrittenPreliminaryProcedureIcon
} from "./Icons";

const statusMap = {
    UNKNOWN: QuestionMarkCircleIcon,
    ADVANCE_PAYMENT_PENDING: CurrencyEuroIcon,
    WRITTEN_PRELIMINARY_PROCEDURE: WrittenPreliminaryProcedureIcon,
    ORDER_FOR_EVIDENCE: OrderForEvidenceIcon,
    AT_THE_APPRAISER: AtTheAppraiserIcon,
    APPRAISERS_REPORT: AppraisersReportIcon,
    SESSION_TO_BE_SCHEDULED: CalendarDaysIcon,
    SESSION: SessionIcon,
    DECISION: DecisionIcon,
    SETTLED: SettledIcon,
};

export const statusKeys = Object.keys(statusMap);

export const statusLabels = {
    UNKNOWN: "Unbekannt",
    ADVANCE_PAYMENT_PENDING: "Kostenvorschuss ausstehend",
    WRITTEN_PRELIMINARY_PROCEDURE: "Schriftliches Vorverfahren",
    ORDER_FOR_EVIDENCE: "Beweisbeschluss",
    AT_THE_APPRAISER: "Beim Sachverständigen",
    APPRAISERS_REPORT: "Gutachten liegt vor",
    SESSION_TO_BE_SCHEDULED: "Kann terminiert werden",
    SESSION: "Verhandlung terminiert",
    DECISION: "Verkündungstermin",
    SETTLED: "Erledigt",
}

export function StatusIcon({status, className}) {
    const iconClasses = className || "size-6";
    return React.createElement(statusMap[status], {className: iconClasses})
}
