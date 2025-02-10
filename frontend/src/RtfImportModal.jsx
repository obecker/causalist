import { DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx/lite';
import { useContext, useEffect, useState } from 'react';

import { ApiContext } from './ApiContext';
import FailureAlert from './FailureAlert';
import ModalDialog from './ModalDialog';

const IMPORTED = 'IMPORTED';
const SETTLED = 'SETTLED';
const UPDATED = 'UPDATED';
const IGNORED = 'IGNORED';
const UNKNOWN = 'UNKNOWN';

export default function RtfImportModal({ isOpen, setIsOpen, forceUpdate }) {
  const api = useContext(ApiContext);

  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setResult(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFile) {
      setResult(null);
    }
  }, [selectedFile]);

  function close() {
    setIsOpen(false);
  }

  function importCases() {
    if (selectedFile) {
      setErrorMessage('');
      api.importCases(selectedFile)
        .then((response) => {
          setResult(response.data);
          setSelectedFile(null);
          forceUpdate();
        })
        .catch((error) => setErrorMessage(error.userMessage));
    }
  }

  function header(type) {
    if (type === 'NEW_CASES') {
      return 'Neue Verfahren';
    } else if (type === 'SETTLED_CASES') {
      return 'Erledigte Verfahren';
    } else if (type === 'UPDATED_RECEIVED_DATES') {
      return 'Aktualisierung Eingangsdatum';
    } else if (type === 'UPDATED_DUE_DATES') {
      return 'Terminaktualisierung';
    }
  }

  return (
    <ModalDialog isOpen={isOpen} onClose={close}>
      {/* use div instead of DialogPanel, removes the onClose handler when clicked outside */}
      <div
        className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
      >
        <DialogTitle as="h3" className="flex justify-between text-lg leading-6 font-semibold">
          RTF-Datei importieren
          <button onClick={close} title="Schließen" className="outline-hidden hover:text-teal-700">
            <XMarkIcon className="inline size-6" />
          </button>
        </DialogTitle>
        <FailureAlert message={errorMessage} className="my-4" />
        <div className="mt-4 w-full">
          <div className="flex items-start justify-between gap-2 align-middle">
            <input
              type="file"
              accept=".rtf"
              className="hidden"
              id="fileinput"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <label
              htmlFor="fileinput"
              className="w-28 shrink-0 justify-center rounded-md bg-stone-200 px-3 py-1.5 text-sm leading-6 font-semibold text-teal-700 shadow-xs hover:bg-stone-100 focus:border-teal-700 focus:ring-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Datei wählen
            </label>
            <div className="w-max grow py-1.5">{selectedFile?.name}</div>
            <button
              disabled={selectedFile === null}
              onClick={importCases}
              className="w-28 shrink-0 justify-center rounded-md bg-teal-700 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Importieren
            </button>
          </div>
          {result && (
            <div className="mt-5 flex flex-col border-t border-dashed border-t-teal-700 pt-5">
              <div className="mb-2 font-semibold">{header(result.importType)}</div>
              <div>
                <ImportResultDetails importType={result.importType} casesType={IMPORTED} refs={result.importedCaseRefs} />
                <ImportResultDetails importType={result.importType} casesType={SETTLED} refs={result.settledCaseRefs} />
                <ImportResultDetails importType={result.importType} casesType={UPDATED} refs={result.updatedCaseRefs} />
                <ImportResultDetails importType={result.importType} casesType={IGNORED} refs={result.ignoredCaseRefs} />
                <ImportResultDetails importType={result.importType} casesType={UNKNOWN} refs={result.unknownCaseRefs} />
                <ol className="mt-2 text-rose-700">
                  {result.errors.map((error, idx) => (
                    <li key={idx} className="mt-1">
                      {error}
                    </li>
                  ))}
                </ol>
              </div>
              <button
                onClick={close}
                className="mt-2 ml-auto w-28 rounded-md bg-teal-700 px-3 py-1.5 text-center text-sm leading-6 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

const importResultDetails = {
  NEW_CASES: {
    IMPORTED: (num) => (num === 1 ? '1 Verfahren wurde importiert' : `${num} Verfahren wurden importiert`),
    UPDATED: (num) => (num === 1 ? '1 Verfahren wurde aktualisiert' : `${num} Verfahren wurden aktualisiert`),
    IGNORED: (num) => (num === 1 ? '1 bekanntes Verfahren wurde ignoriert' : `${num} bekannte Verfahren wurden ignoriert`),
  },
  SETTLED_CASES: {
    SETTLED: (num) => (num === 1 ? '1 Verfahren wurde erledigt' : `${num} Verfahren wurden erledigt`),
    UPDATED: (num) => (num === 1 ? '1 Erledigung wurde aktualisiert' : `${num} Erledigungen wurden aktualisiert`),
    IGNORED: (num) => (num === 1 ? '1 Erledigung war bereits aktuell' : `${num} Erledigungen waren bereits aktuell`),
    UNKNOWN: (num) => (num === 1 ? '1 Verfahren ist nicht im Bestand' : `${num} Verfahren sind nicht im Bestand`),
  },
  UPDATED_RECEIVED_DATES: {
    UPDATED: (num) => (num === 1 ? '1 Eingangsdatum wurde aktualisiert' : `${num} Eingangsdaten wurden aktualisiert`),
    IGNORED: (num) => (num === 1 ? '1 Eingangsdatum war bereits aktuell' : `${num} Eingangsdaten waren bereits aktuell`),
    UNKNOWN: (num) => (num === 1 ? '1 Verfahren ist nicht im Bestand' : `${num} Verfahren sind nicht im Bestand`),
  },
  UPDATED_DUE_DATES: {
    UPDATED: (num) => (num === 1 ? '1 Termin wurde aktualisiert' : `${num} Termine wurden aktualisiert`),
    IGNORED: (num) => (num === 1 ? '1 Termin war bereits aktuell' : `${num} Termine waren bereits aktuell`),
    UNKNOWN: (num) => (num === 1 ? '1 Verfahren ist nicht im Bestand' : `${num} Verfahren sind nicht im Bestand`),
  },
};

function ImportResultDetails({ importType, casesType, refs }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const importResultText = importResultDetails[importType]?.[casesType]?.(refs.length);
  return (importResultText && (
    <div className="w-full">
      <div
        className={clsx(
          'flex gap-1 align-bottom',
          refs.length && 'cursor-pointer hover:underline',
          detailsOpen && 'font-semibold',
        )}
        onClick={() => setDetailsOpen((o) => refs.length && !o)}
      >
        <div>{importResultText}</div>
        {refs.length > 0 && (detailsOpen
          ? <ChevronUpIcon className="size-6 cursor-pointer" />
          : <ChevronDownIcon className="size-6 cursor-pointer" />
        )}
      </div>
      {refs.length > 0 && detailsOpen && (
        <ul className="mb-4 grid w-full grid-cols-4 gap-x-1 gap-y-0.5">
          {refs.map((ref, i) => (
            <li key={i}>{ref}</li>
          ))}
        </ul>
      )}
    </div>
  ));
}
