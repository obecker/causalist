import {Dialog, Transition} from "@headlessui/react";
import {XMarkIcon} from "@heroicons/react/24/outline";
import {Fragment, useContext, useEffect, useState} from "react";
import {ApiContext} from "./ApiProvider";
import FailureAlert from "./FailureAlert";

export default function FileUploadModal({isOpen, setIsOpen, forceUpdate}) {

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
            api.importCases(selectedFile)
                .then((response) => {
                    setResult(response.data);
                    setSelectedFile(null);
                    forceUpdate();
                })
                .catch(error => setErrorMessage(error.userMessage));
        }
    }

    function importedCasesText(type, num) {
        if (type === 'UPDATED_DATES') {
            return num === 1 ? '1 Termin wurde aktualisiert' : `${num} Termine wurden aktualisiert`;
        } else if (type === 'NEW_CASES') {
            return num === 1 ? '1 Verfahren wurde importiert' : `${num} Verfahren wurden importiert`;
        }
    }

    function ignoredCasesText(type, num) {
        if (type === 'UPDATED_DATES') {
            return num === 1 ? '1 Termin war bereits aktuell' : `${num} Termine waren bereits aktuell`;
        } else if (type === 'NEW_CASES') {
            return num === 1 ? '1 bekanntes Verfahren wurde ignoriert' : `${num} bekannte Verfahren wurden ignoriert`;
        }
    }

    return (
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
                    <div className="fixed inset-0 bg-black/25"/>
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
                            <div className="w-full max-w-lg
                                            transform transition-all overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl ">
                                <Dialog.Title as="h3"
                                              className="text-lg font-medium leading-6 text-stone-900 flex justify-between">
                                    RTF-Datei importieren
                                    <button onClick={close} title="Schließen" className="outline-none">
                                        <XMarkIcon className="inline size-6"/>
                                    </button>
                                </Dialog.Title>
                                <FailureAlert message={errorMessage} className="my-4"/>
                                <div className="w-full mt-4">
                                    <div className="flex align-middle justify-between gap-2">
                                        <input type="file" accept=".rtf" className="hidden" id="fileinput"
                                               onChange={(e) => setSelectedFile(e.target.files[0])}/>
                                        <label htmlFor="fileinput"
                                               className="flex w-28 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-stone-200 text-teal-700 shadow-sm hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus:ring-teal-700 focus:border-teal-700 cursor-pointer">
                                            Datei wählen
                                        </label>
                                        <div className="grow w-max py-1.5">{selectedFile && selectedFile.name}</div>
                                        <button disabled={selectedFile === null} onClick={importCases}
                                                className="flex w-28 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-teal-700 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                                            Hochladen
                                        </button>
                                    </div>
                                    {result &&
                                        <div className="mt-5 pt-5 border-t border-dashed border-t-teal-700
                                                        flex justify-between items-end gap-2">
                                            <div>
                                                <div>{importedCasesText(result.importType, result.importedCases)}</div>
                                                <div>{ignoredCasesText(result.importType, result.ignoredCases)}</div>
                                                <ol className="text-rose-700 mt-2">
                                                    {result.errors.map((error, idx) =>
                                                        <li key={idx} className="mt-1">{error}</li>)}
                                                </ol>
                                            </div>
                                            <button onClick={close}
                                                    className="flex w-28 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-teal-700 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                                            >Schließen
                                            </button>
                                        </div>
                                    }
                                </div>
                            </div>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
