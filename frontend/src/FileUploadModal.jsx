import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx/lite';
import { Fragment, useContext, useEffect, useState } from 'react';
import { ApiContext } from './ApiProvider';
import FailureAlert from './FailureAlert';

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
        .catch(error => setErrorMessage(error.userMessage));
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* use div instead of Dialog.Panel, removes the onClose handler when clicked outside */}
              <div className={panelClasses}>
                <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-stone-900 flex justify-between">
                  {`Datei zum Verfahren ${selectedCase.ref.value} hochladen`}
                  <button onClick={close} title="Schließen" className="outline-none">
                    <XMarkIcon className="inline size-6" />
                  </button>
                </Dialog.Title>
                <FailureAlert message={errorMessage} className="my-4" />
                <div className="w-full mt-4">
                  <div className="flex align-middle items-start justify-between gap-2">
                    <input
                      type="file"
                      className="hidden"
                      id="fileinput"
                      onChange={e => setSelectedFile(e.target.files[0])}
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
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  ));
}
