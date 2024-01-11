import {Dialog, Listbox, Transition} from '@headlessui/react'
import {ChevronDownIcon, ChevronUpIcon} from "@heroicons/react/24/solid";
import {useMediaQuery} from "@uidotdev/usehooks";
import {Fragment, useContext, useEffect, useRef, useState} from 'react'
import {ApiContext} from "./ApiProvider";
import FailureAlert from "./FailureAlert";
import {StatusIcon, statusKeys, statusLabels} from "./Status";
import {today} from "./utils";

export default function EditModal({isOpen, setIsOpen, caseResource, forceUpdate}) {

    const api = useContext(ApiContext);

    const [refEntity, setRefEntity] = useState('');
    const [refRegister, setRefRegister] = useState('');
    const [refNo, setRefNo] = useState('');
    const [refYear, setRefYear] = useState('');
    const [caseType, setCaseType] = useState('');
    const [caseParties, setCaseParties] = useState('');
    const [caseArea, setCaseArea] = useState('');
    const [caseStatus, setCaseStatus] = useState('');
    const [caseStatusNote, setCaseStatusNote] = useState('');
    const [caseMemo, setCaseMemo] = useState('');
    const [caseReceivedOn, setCaseReceivedOn] = useState('');
    const [caseSettledOn, setCaseSettledOn] = useState('');
    const [caseDueDate, setCaseDueDate] = useState('');
    const [caseTodoDate, setCaseTodoDate] = useState('');

    const [refEntityFailure, setRefEntityFailure] = useState(false);
    const [refRegisterFailure, setRefRegisterFailure] = useState(false);
    const [refNoFailure, setRefNoFailure] = useState(false);
    const [refYearFailure, setRefYearFailure] = useState(false);
    const [caseTypeFailure, setCaseTypeFailure] = useState(false);
    const [caseReceivedOnFailure, setCaseReceivedOnFailure] = useState(false);
    const [caseSettledOnFailure, setCaseSettledOnFailure] = useState(false);
    const [caseTodoDateFailure, setCaseTodoDateFailure] = useState(false);

    const refRegisterInput = useRef();
    const refNoInput = useRef();
    const refYearInput = useRef();

    const [errorOnSave, setErrorOnSave] = useState('');

    const xlWidth = useMediaQuery('(min-width: 1280px)');

    useEffect(() => {
        setRefEntity((caseResource.ref.entity || '').toString());
        setRefRegister(caseResource.ref.register || '');
        setRefNo((caseResource.ref.number || '').toString());
        setRefYear((caseResource.ref.year && caseResource.ref.year.toString().padStart(2, '0')) || '');
        setCaseType(caseResource.type || '');
        setCaseParties(caseResource.parties || '');
        setCaseArea(caseResource.area || '');
        setCaseStatus(caseResource.status || 'UNKNOWN');
        setCaseStatusNote(caseResource.statusNote || '');
        setCaseMemo(caseResource.memo || '');
        setCaseReceivedOn(caseResource.receivedOn || today());
        setCaseSettledOn(caseResource.settledOn || '');
        setCaseDueDate(caseResource.dueDate || '');
        setCaseTodoDate(caseResource.todoDate || '');

        setRefEntityFailure(false);
        setRefRegisterFailure(false);
        setRefNoFailure(false);
        setRefYearFailure(false);
        setCaseTypeFailure(false);
        setCaseReceivedOnFailure(false);
        setCaseSettledOnFailure(false);
        setCaseTodoDateFailure(false);
    }, [caseResource]);

    useEffect(() => {
        if (isOpen) {
            setErrorOnSave('');
        }
    }, [isOpen]);

    function nullIfEmpty(value) {
        return value === '' ? null : value;
    }

    function setNewStatus(status) {
        setCaseStatus(status);
        if (status === 'SETTLED' && caseSettledOn === '') {
            setCaseSettledOn(today());
        }
    }

    function focusNextOnSpace(event, next) {
        if (event.key === ' ') {
            event.preventDefault();
            next.current.focus();
        }
    }

    function pasteReference(event) {
        event.preventDefault();
        const reference = (event.clipboardData || window.clipboardData).getData("text");
        const parts = reference.split(/[ /]/, 4);
        event.target.value = parts[0];
        refRegisterInput.current.value = parts[1];
        refNoInput.current.value = parts[2];
        refYearInput.current.value = parts[3];
        refYearInput.current.focus()
    }

    function saveErrorHandler(error) {
        if (error.response.status === 409) {
            setErrorOnSave("Es gibt bereits ein Verfahren mit diesem Aktenzeichen.");
        } else if (error.response.status === 400) {
            setErrorOnSave("Verfahren konnte nicht gespeichert werden: " + error.response.message);
        } else {
            setErrorOnSave(error.userMessage);
        }
    }

    function saveCase(e) {
        const onlyNumbers = /^[0-9]+$/;
        let refEntityFailed = !onlyNumbers.test(refEntity) || refEntity.length > 5;
        let refRegisterFailed = !['O', 'OH', 'S', 'T'].includes(refRegister);
        let refNoFailed = !onlyNumbers.test(refNo) || refNo.length > 5;
        let refYearFailed = !onlyNumbers.test(refYear) || refYear.length !== 2;
        let caseTypeFailed = caseType !== 'SINGLE' && caseType !== 'CHAMBER';
        let caseReceivedOnFailed = caseReceivedOn === '';
        let caseSettledOnFailed = caseStatus === 'SETTLED' && caseSettledOn === '';
        let caseTodoDateFailed = caseDueDate !== '' && caseTodoDate === '';

        setRefEntityFailure(refEntityFailed);
        setRefRegisterFailure(refRegisterFailed);
        setRefNoFailure(refNoFailed);
        setRefYearFailure(refYearFailed);
        setCaseTypeFailure(caseTypeFailed);
        setCaseReceivedOnFailure(caseReceivedOnFailed);
        setCaseSettledOnFailure(caseSettledOnFailed);
        setCaseTodoDateFailure(caseTodoDateFailed);

        let validationFailed = refEntityFailed || refRegisterFailed || refNoFailed || refYearFailed || caseTypeFailed || caseReceivedOnFailed || caseSettledOnFailed || caseTodoDateFailed;
        if (!validationFailed) {
            caseResource.ref.entity = refEntity;
            caseResource.ref.register = refRegister;
            caseResource.ref.number = refNo;
            caseResource.ref.year = refYear;
            caseResource.type = caseType;
            caseResource.parties = caseParties;
            caseResource.area = caseArea;
            caseResource.status = caseStatus;
            caseResource.statusNote = caseStatusNote;
            caseResource.memo = caseMemo;
            caseResource.receivedOn = nullIfEmpty(caseReceivedOn);
            caseResource.settledOn = nullIfEmpty(caseSettledOn);
            caseResource.dueDate = nullIfEmpty(caseDueDate);
            caseResource.todoDate = nullIfEmpty(caseTodoDate);

            if (caseResource.id) {
                api.updateCase(caseResource)
                    .then(response => {
                        setIsOpen(false);
                        forceUpdate(response.data);
                    })
                    .catch(saveErrorHandler);
            } else {
                api.persistCase(caseResource)
                    .then(response => {
                        setIsOpen(false);
                        forceUpdate(response.data);
                    })
                    .catch(saveErrorHandler);
            }
        }
        e.preventDefault();
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
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
                            <div className="w-full min-w-[322px] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-4xl xl:max-w-6xl
                                            transform transition-all overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl ">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-stone-900">
                                    {caseResource.id ? 'Verfahren bearbeiten' : 'Neues Verfahren'}
                                </Dialog.Title>
                                <div className="w-full mt-4">
                                    <form onSubmit={saveCase}
                                          className="grid grid-cols-1 gap-6 sm:grid-cols-6 lg:grid-cols-4">
                                        <div className="sm:col-span-4 lg:col-span-2 xl:col-span-1">
                                            <label className="block">Aktenzeichen</label>
                                            <div className="block w-fit rounded-lg border border-stone-300">
                                                <input minLength="1" maxLength="4" tabIndex="1"
                                                       value={refEntity}
                                                       onKeyDown={(e) => focusNextOnSpace(e, refRegisterInput)}
                                                       onPaste={pasteReference}
                                                       onChange={(e) => setRefEntity(e.target.value.trim())}
                                                       className={`mr-1 w-16 border-0 rounded-l-lg focus:ring-2 focus:ring-teal-700 ${(refEntityFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                                <input minLength="1" maxLength="2" tabIndex="2"
                                                       value={refRegister}
                                                       ref={refRegisterInput}
                                                       onKeyDown={(e) => focusNextOnSpace(e, refNoInput)}
                                                       onChange={(e) => setRefRegister(e.target.value.trim().toUpperCase())}
                                                       className={`mr-1 w-12 border-0 focus:ring-2 focus:ring-teal-700 ${(refRegisterFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                                <input minLength="1" maxLength="4" tabIndex="3"
                                                       value={refNo}
                                                       ref={refNoInput}
                                                       onKeyDown={(e) => focusNextOnSpace(e, refYearInput)}
                                                       onChange={(e) => setRefNo(e.target.value.trim())}
                                                       className={`w-16 border-0 focus:ring-2 focus:ring-teal-700 ${(refNoFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                                <span>/</span>
                                                <input minLength="2" maxLength="2" tabIndex="4"
                                                       value={refYear}
                                                       ref={refYearInput}
                                                       onChange={(e) => setRefYear(e.target.value.trim())}
                                                       className={`w-12 border-0 rounded-r-lg focus:ring-2 focus:ring-teal-700 ${(refYearFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 xl:col-span-1 sm:pt-2">
                                            <div className="flex items-center mb-4">
                                                <label className="text-sm font-medium">
                                                    <input type="radio" name="type" value="SINGLE" tabIndex="5"
                                                           checked={caseType === "SINGLE"}
                                                           onChange={() => setCaseType('SINGLE')}
                                                           className={`w-4 h-4 mr-2 text-teal-700 border-stone-300 focus:ring-teal-700 focus:ring-2 ${(caseTypeFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                                    Einzelrichter
                                                </label>
                                            </div>
                                            <div className="flex items-center">
                                                <label className="text-sm font-medium">
                                                    <input type="radio" name="type" value="CHAMBER" tabIndex="6"
                                                           checked={caseType === "CHAMBER"}
                                                           onChange={() => setCaseType('CHAMBER')}
                                                           className={`w-4 h-4 mr-2 text-teal-700 border-stone-300 focus:ring-teal-700 focus:ring-2 ${(caseTypeFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                                    Kammersache</label>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-6 lg:col-span-2">
                                            <label htmlFor="parties"
                                                   className="block mb-2 text-sm font-medium">Parteien</label>
                                            <input id="parties" name="parties" value={caseParties} tabIndex="7"
                                                   onChange={(e) => setCaseParties(e.target.value)}
                                                   className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5"/>
                                        </div>
                                        <div className="sm:col-span-6 lg:col-span-2">
                                            <label htmlFor="area"
                                                   className="block mb-2 text-sm font-medium">Rechtsgebiet</label>
                                            <input id="area" name="area" tabIndex={xlWidth ? 9 : 8}
                                                   value={caseArea}
                                                   onChange={(e) => setCaseArea(e.target.value)}
                                                   className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5"/>
                                        </div>
                                        <div
                                            className="sm:col-span-6 lg:col-span-4 xl:col-span-2 xl:col-start-1 xl:row-start-2">
                                            <label htmlFor="status"
                                                   className="block mb-2 text-sm font-medium">Status</label>
                                            <Listbox id="status" value={caseStatus} onChange={setNewStatus}>
                                                {({open}) => (
                                                    <div className="relative">
                                                        <Listbox.Button tabIndex={xlWidth ? 8 : 9}
                                                                        className={`text-sm bg-stone-50 border border-stone-300 rounded-lg 
                                                                    outline-none focus:ring-teal-700 focus:ring-2 focus:border-teal-700
                                                                    ${open ? 'ring-teal-700 ring-2 border-teal-700' : ''} 
                                                                    shadow-sm w-full p-2.5 flex justify-stretch items-center`}>
                                                            <StatusIcon status={caseStatus}
                                                                        className="size-6 mr-2 flex-none"/>
                                                            <div className="flex-auto text-left">
                                                                {statusLabels[caseStatus]}
                                                            </div>
                                                            {open ? <ChevronUpIcon className="w-4 h-4 flex-none"/>
                                                                : <ChevronDownIcon className="w-4 h-4 flex-none"/>}
                                                        </Listbox.Button>
                                                        <Listbox.Options
                                                            className="absolute w-full lg:max-h-72 overflow-y-auto mt-0.5 py-2 z-20 bg-stone-50 border rounded-lg shadow shadow-stone-400 outline-none">
                                                            {statusKeys.map((status) => (
                                                                <Listbox.Option key={status} value={status}
                                                                                className="flex px-2 py-1 ui-active:!bg-teal-700 ui-active:text-white ui-selected:bg-stone-200">
                                                                    <StatusIcon status={status}
                                                                                className="size-6 mr-2 flex-none"/>
                                                                    <div className="flex-auto text-sm text-left">
                                                                        {statusLabels[status]}
                                                                    </div>
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </div>
                                                )}
                                            </Listbox>
                                        </div>
                                        <div className="sm:col-span-6 lg:col-span-2">
                                            <label htmlFor="statusNote"
                                                   className="block mb-2 text-sm font-medium">Status-Notiz</label>
                                            <textarea id="statusNote" name="statusNote" rows="3" tabIndex="10"
                                                      value={caseStatusNote}
                                                      onChange={(e) => setCaseStatusNote(e.target.value)}
                                                      className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5"/>
                                        </div>
                                        <div className="sm:col-span-6 lg:col-span-2">
                                            <label htmlFor="caseMemo"
                                                   className="block mb-2 text-sm font-medium">Anmerkung</label>
                                            <textarea id="caseMemo" name="caseMemo" rows="3" tabIndex="11"
                                                      value={caseMemo}
                                                      onChange={(e) => setCaseMemo(e.target.value)}
                                                      className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5"/>
                                        </div>
                                        <div className="sm:col-span-3 lg:col-span-1">
                                            <label htmlFor="receivedOn"
                                                   className="block mb-2 text-sm font-medium">Eingegangen am</label>
                                            <input id="receivedOn" name="receivedOn" type="date" tabIndex="12"
                                                   value={caseReceivedOn}
                                                   onChange={(e) => setCaseReceivedOn(e.target.value)}
                                                   onFocus={(e) => e.target.defaultValue = ""}
                                                   className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 ${(caseReceivedOnFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                        </div>
                                        <div className="sm:col-span-3 lg:col-span-1">
                                            <label htmlFor="settledOn"
                                                   className="block mb-2 text-sm font-medium">Erledigt am</label>
                                            <input id="settledOn" name="settledOn" type="date" tabIndex="13"
                                                   value={caseSettledOn}
                                                   onChange={(e) => setCaseSettledOn(e.target.value)}
                                                   onFocus={(e) => e.target.defaultValue = ""}
                                                   className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 ${(caseSettledOnFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                        </div>
                                        <div className="sm:col-span-3 lg:col-span-1">
                                            <label htmlFor="todoDate"
                                                   className="block mb-2 text-sm font-medium">Vorfrist am</label>
                                            <input id="todoDate" name="todoDate" type="date" tabIndex="15"
                                                   value={caseTodoDate}
                                                   onChange={(e) => setCaseTodoDate(e.target.value)}
                                                   onFocus={(e) => e.target.defaultValue = ""}
                                                   className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 ${(caseTodoDateFailure && 'bg-rose-100') || 'bg-stone-50'}`}/>
                                        </div>
                                        <div className="sm:col-span-3 lg:col-span-1">
                                            <label htmlFor="dueDate"
                                                   className="block mb-2 text-sm font-medium">nächster Termin am</label>
                                            <input id="dueDate" name="dueDate" type="date" tabIndex="14"
                                                   value={caseDueDate}
                                                   onChange={(e) => setCaseDueDate(e.target.value)}
                                                   onFocus={(e) => e.target.defaultValue = ""}
                                                   className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5"/>
                                        </div>
                                        <FailureAlert message={errorOnSave} className="col-span-full"/>
                                        <div className="col-span-full flex justify-center gap-6">
                                            <button
                                                type="button" tabIndex="16"
                                                className="flex w-40 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-stone-200 text-teal-700 shadow-sm hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus:ring-teal-700 focus:border-teal-700"
                                                onClick={() => setIsOpen(false)}>
                                                Abbrechen
                                            </button>
                                            <button
                                                type="submit" tabIndex="17"
                                                className="flex w-40 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-teal-700 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                                                {caseResource.id ? 'Speichern' : 'Anlegen'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
