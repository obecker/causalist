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

  const panelClasses = clsx('w-full max-w-lg transform transition-all overflow-hidden rounded-2xl bg-white',
    'p-6 text-left align-middle shadow-xl');
  const fileInputClasses = clsx('flex-none w-28 justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'leading-6 text-teal-700 bg-stone-200 hover:bg-stone-100 shadow-sm',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700',
    'focus:ring-teal-700 focus:border-teal-700 cursor-pointer');
  const fileUploadClasses = clsx('flex-none w-28 justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'leading-6 text-white bg-teal-700 hover:bg-teal-600 shadow-sm disabled:bg-stone-300 disabled:cursor-not-allowed',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700');

  return (selectedCase && (
    <ModalDialog isOpen={isOpen} onClose={close}>
      {/* use div instead of DialogPanel, removes the onClose handler when clicked outside */}
      <div className={panelClasses}>
        <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-stone-900 flex justify-between">
          {`Datei zum Verfahren ${selectedCase.ref.value} hochladen`}
          <button onClick={close} title="Schließen" className="outline-none">
            <XMarkIcon className="inline size-6" />
          </button>
        </DialogTitle>
        <FailureAlert message={errorMessage} className="my-4" />
        <div className="w-full mt-4">
          <div className="flex align-middle items-start justify-between gap-2">
            <input
              type="file"
              className="hidden"
              id="fileinput"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <label htmlFor="fileinput" className={fileInputClasses}>
              Datei wählen
            </label>
            <div className="grow w-max py-1.5">{selectedFile?.name}</div>
            <button disabled={selectedFile === null} onClick={upload} className={fileUploadClasses}>
              Hochladen
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  ));
}
