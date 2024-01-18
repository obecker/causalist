import {Dialog, Transition} from "@headlessui/react";
import {Fragment, useContext, useEffect, useState} from "react";
import {ApiContext} from "./ApiProvider";
import FailureAlert from "./FailureAlert";
import {statusLabels} from "./Status";

export default function DeleteModal({isOpen, setIsOpen, caseResource, forceUpdate}) {

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
        api.deleteCase(caseResource.id)
            .then(() => {
                close();
                forceUpdate();
            })
            .catch(error => setErrorMessage(error.userMessage));
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
                            <div className="w-full max-w-sm
                                            transform transition-all overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl ">
                                <Dialog.Title as="h3"
                                              className="text-lg font-semibold leading-6 text-stone-900 text-center text-pretty">
                                    Verfahren {caseResource.ref.value} aus dem Bestand löschen?
                                </Dialog.Title>
                                <div className="w-full mt-4">
                                    {caseResource.parties}
                                </div>
                                <div className="w-full mt-2">
                                    Status: {statusLabels[caseResource.status]}
                                </div>
                                <FailureAlert message={errorMessage} className="my-4"/>
                                <div className="w-full mt-4">
                                    <div className="flex justify-center gap-6">
                                        <button
                                            type="button"
                                            className="flex w-32 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-stone-200 text-teal-700 shadow-sm hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus:ring-teal-700 focus:border-teal-700"
                                            onClick={close}>
                                            Abbrechen
                                        </button>
                                        <button
                                            type="button"
                                            className="flex w-32 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-rose-700 text-white shadow-sm hover:bg-rose-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                                            onClick={deleteCase}>
                                            Löschen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
