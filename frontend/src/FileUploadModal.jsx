import { DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx/lite';
import { useContext, useEffect, useState } from 'react';

import { ApiContext } from './ApiContext';
import FailureAlert from './FailureAlert';
import ModalDialog from './ModalDialog';

export default function FileUploadModal({ isOpen, setIsOpen, selectedCase, forceUpdate }) {
  const api = useContext(ApiContext);

  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  function close() {
    setIsOpen(false);
  }

  function upload() {
    if (selectedFile) {
      api.uploadCaseDocument(selectedCase.id, selectedFile)
        .then(() => {
          setSelectedFile(null);
          close();
          forceUpdate();
        })
        .catch((error) => setErrorMessage(error.userMessage));
    }
  }

  const panelClasses = clsx(
    'w-full max-w-lg transform overflow-hidden rounded-2xl bg-white transition-all',
    'p-6 text-left align-middle shadow-xl',
  );
  const fileInputClasses = clsx(
    'w-28 flex-none justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'bg-stone-200 leading-6 text-teal-700 shadow-xs hover:bg-stone-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700',
    'focus:border-teal-700 focus:ring-teal-700',
  );
  const fileUploadClasses = clsx(
    'w-28 flex-none justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'bg-teal-700 leading-6 text-white shadow-xs hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-stone-300',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700',
  );

  return (selectedCase && (
    <ModalDialog isOpen={isOpen} onClose={close}>
      {/* use div instead of DialogPanel, removes the onClose handler when clicked outside */}
      <div className={panelClasses}>
        <DialogTitle as="h3" className="flex justify-between text-lg leading-6 font-semibold">
          {`Datei zum Verfahren ${selectedCase.ref.value} hochladen`}
          <button onClick={close} title="Schließen" className="outline-hidden hover:text-teal-700">
            <XMarkIcon className="inline size-6" />
          </button>
        </DialogTitle>
        <FailureAlert message={errorMessage} className="my-4" />
        <div className="mt-4 w-full">
          <div className="flex items-start justify-between gap-2 align-middle">
            <input
              type="file"
              className="hidden"
              id="fileinput"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <label htmlFor="fileinput" className={fileInputClasses}>
              Datei wählen
            </label>
            <div className="w-max grow py-1.5">{selectedFile?.name}</div>
            <button disabled={selectedFile === null} onClick={upload} className={fileUploadClasses}>
              Hochladen
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  ));
}
