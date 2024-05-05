function Svg({ className, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function LegalAidIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        fill="none"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.5 18v-12h1.5a3.5 3.5 0 0 1 0 7h-1.5zM9 6v12m0-4.5l5-7.5m.5 12l-3.4-6.8zM17 6v12m5.5 0v-12m0 5.5h-5.5"
      />
    </Svg>
  );
}

export function WrittenPreliminaryProcedureIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        strokeWidth="0.75"
        strokeLinejoin="round"
        d="M16 6l-10 8-.75 1.625 1.75-.375 10-8m.75-.6l1-.8a.8 .8 0 0 0-1-1.25l-1 .8"
        transform="scale(1.2, 1.2) rotate(-10, 12, 12) translate(-1.5 -2)"
      />
      <path
        strokeWidth="1"
        strokeLinecap="round"
        d="M10 18h10m0 2h-16m0 2h16"
      />
    </Svg>
  );
}

export function AtTheAppraiserIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4l10 3-10 3-10-3zm-5.5 7l-0.25 4a6 3 0 0 0 11.5 0l-0.25-4l-5.5 1.5zm-2.5-1v9a1 1.5 0 1 0 0 3a1 1.5 0 1 0 0-3"
      />
    </Svg>
  );
}

export function AppraisersReportIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        fill="none"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M9 19h-5v-17h13v9M6.75 5.5h7.5m0 2.5h-7.5"
      />
      <path
        strokeWidth="0"
        fillRule="evenodd"
        d="M14 11.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9m0 1a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7m0 .75a2.75 2.75 0 1 1 0 5.5a2.75 2.75 0 1 1 0-5.5M10.5 19.5a5 5 0 0 0 1.5 1l-1 2.5-.875-1.375-1.675-.125zM17.5 19.5a5 5 0 0 1-1.5 1l1 2.5 .875-1.375 1.675-.125z"
      />
    </Svg>
  );
}

export function DecisionIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 20l2 2 5-5-2-2zM7 7a6 2.5-45 0 1 5-5zM17 17a6 2.5-45 0 0 5-5zM13 4l7 7-4 4-7-7zM8 16l3-3"
      />
    </Svg>
  );
}

export function SessionIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M12 4a1.5 1.75 0 0 0 0 3.5a1.5 1.75 0 0 0 0-3.5m-7 .5a1.5 1.75 0 0 0 0 3.5a1.5 1.75 0 0 0 0-3.5m14 0a1.5 1.75 0 0 0 0 3.5a1.5 1.75 0 0 0 0-3.5M8.5 16a3.5 6.5 0 0 1 7 0zm-7.5 2h22m0 2h-22"
      />
      <path
        strokeWidth="0"
        d="M2 16.75a.5 .5 0 0 1-.5-.5a3.75 7 0 0 1 6.5-4.75a4 7 0 0 0-1 5.25zM22 16.75a.5 .5 0 0 0 .5-.5a3.75 7 0 0 0-6.5-4.75a4 7 0 0 1 1 5.25z"
      />
    </Svg>
  );
}

export function SettledIcon({ className }) {
  return (
    <Svg className={className}>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 13l6 6 9.5-14-9.5 12z"
      />
    </Svg>
  );
}
