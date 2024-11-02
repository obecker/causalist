import { DialogTitle } from '@headlessui/react';
import clsx from 'clsx/lite';
import { useContext, useEffect, useState } from 'react';
import { ApiContext } from './ApiContext';
import FailureAlert from './FailureAlert';
import ModalDialog from './ModalDialog';
import { statusLabels } from './status';

export default function DeleteModal({ isOpen, setIsOpen, selectedCase, forceUpdate }) {
  const api = useContext(ApiContext);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
    }
  }, [isOpen]);

  function close() {
    setIsOpen(false);
  }

  function deleteCase() {
    api.deleteCase(selectedCase.id)
      .then(() => {
        close();
        forceUpdate();
      })
      .catch((error) => setErrorMessage(error.userMessage));
  }

  const panelClasses = clsx('w-full max-w-sm transform transition-all overflow-hidden rounded-2xl bg-white',
    'p-6 text-left align-middle shadow-xl');
  const closeButtonClasses = clsx('flex w-32 justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'leading-6 bg-stone-200 text-teal-700 shadow-sm hover:bg-stone-100',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700',
    'focus:ring-teal-700 focus:border-teal-700');
  const deleteButtonClasses = clsx('flex w-32 justify-center rounded-md px-3 py-1.5 text-sm font-semibold',
    'leading-6 bg-rose-700 text-white shadow-sm hover:bg-rose-600',
    'disabled:bg-stone-300 disabled:cursor-not-allowed',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700');

  return (selectedCase && (
    <ModalDialog isOpen={isOpen} onClose={close}>
      {/* use div instead of DialogPanel, removes the onClose handler when clicked outside */}
      <div className={panelClasses}>
        <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-stone-900 text-center text-pretty">
          {`Verfahren ${selectedCase.ref.value} aus dem Bestand löschen?`}
        </DialogTitle>
        <div className="w-full mt-4">
          {selectedCase.parties}
        </div>
        <div className="w-full mt-2">
          {`Status: ${statusLabels[selectedCase.status]}`}
        </div>
        <FailureAlert message={errorMessage} className="my-4" />
        <div className="w-full mt-4">
          <div className="flex justify-center gap-6">
            <button type="button" className={closeButtonClasses} onClick={close}>
              Abbrechen
            </button>
            <button type="button" className={deleteButtonClasses} onClick={deleteCase}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  ));
}
