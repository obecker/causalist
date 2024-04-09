import { Dialog, Listbox } from '@headlessui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { useMediaQuery } from '@uidotdev/usehooks';
import clsx from 'clsx/lite';
import { useContext, useEffect, useRef, useState } from 'react';
import { ApiContext } from './ApiProvider';
import FailureAlert from './FailureAlert';
import ModalDialog from './ModalDialog';
import { statusKeys, statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { today } from './utils';

export default function EditModal({ isOpen, setIsOpen, selectedCase, forceUpdate }) {
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
  const [caseMarkerColor, setCaseMarkerColor] = useState('');
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

  const [fieldsDisabled, setFieldsDisabled] = useState(false);
  const [errorOnLoad, setErrorOnLoad] = useState('');
  const [errorOnSave, setErrorOnSave] = useState('');
  const [saving, setSaving] = useState(false);

  const xlWidth = useMediaQuery('(min-width: 1280px)');

  // see index.css for corresponding CSS colors
  const markerColors = ['', 'gray', 'red', 'yellow', 'green', 'blue', 'purple'];

  useEffect(() => {
    setRefEntity('');
    setRefRegister('');
    setRefNo('');
    setRefYear('');
    setCaseType('');
    setCaseParties('');
    setCaseArea('');
    setCaseStatus('');
    setCaseStatusNote('');
    setCaseMemo('');
    setCaseMarkerColor('');
    setCaseReceivedOn('');
    setCaseSettledOn('');
    setCaseDueDate('');
    setCaseTodoDate('');

    if (selectedCase && isOpen) {
      setFieldsDisabled(true);
      api.getCase(selectedCase.id)
        .then((response) => {
          let caseResource = response.data;
          setRefEntity(caseResource.ref.entity.toString());
          setRefRegister(caseResource.ref.register);
          setRefNo(caseResource.ref.number.toString());
          setRefYear(caseResource.ref.year.toString().padStart(2, '0'));
          setCaseType(caseResource.type);
          setCaseParties(caseResource.parties ?? '');
          setCaseArea(caseResource.area ?? '');
          setCaseStatus(caseResource.status);
          setCaseStatusNote(caseResource.statusNote ?? '');
          setCaseMemo(caseResource.memo ?? '');
          setCaseMarkerColor(caseResource.markerColor ?? '');
          setCaseReceivedOn(caseResource.receivedOn);
          setCaseSettledOn(caseResource.settledOn ?? '');
          setCaseDueDate(caseResource.dueDate ?? '');
          setCaseTodoDate(caseResource.todoDate ?? '');
          setFieldsDisabled(false);
        })
        .catch((error) => setErrorOnLoad(error.userMessage));
    } else {
      setCaseStatus('UNKNOWN');
      setCaseReceivedOn(today());
    }

    setRefEntityFailure(false);
    setRefRegisterFailure(false);
    setRefNoFailure(false);
    setRefYearFailure(false);
    setCaseTypeFailure(false);
    setCaseReceivedOnFailure(false);
    setCaseSettledOnFailure(false);
    setCaseTodoDateFailure(false);
  }, [selectedCase, isOpen]);

  function close() {
    setErrorOnLoad('');
    setErrorOnSave('');
    setFieldsDisabled(false);
    setSaving(false);
    setIsOpen(false);
  }

  function nullIfEmpty(value) {
    return value === '' ? null : value;
  }

  function setNewStatus(status) {
    setCaseStatus(status);
    if (status === 'SETTLED' && caseSettledOn === '') {
      setCaseSettledOn(today());
    }
  }

  function focusNextOnKey(event, key, next) {
    if (event.key === key) {
      event.preventDefault();
      next.current.focus();
    }
  }

  function pasteReference(event) {
    event.preventDefault();
    const reference = (event.clipboardData ?? window.clipboardData).getData('text');
    const parts = reference.split(/[ /]/, 4);
    event.target.value = parts[0];
    refRegisterInput.current.value = parts[1];
    refNoInput.current.value = parts[2];
    refYearInput.current.value = parts[3];
    refYearInput.current.focus();
  }

  function saveErrorHandler(error) {
    if (error.response.status === 409) {
      setErrorOnSave('Es gibt bereits ein Verfahren mit diesem Aktenzeichen.');
    } else if (error.response.status === 400) {
      setErrorOnSave('Verfahren konnte nicht gespeichert werden: ' + error.response.message);
    } else {
      setErrorOnSave(error.userMessage);
    }
    setSaving(false);
  }

  function saveCase(e) {
    const onlyNumbers = /^[0-9]+$/;
    let refEntityFailed = !onlyNumbers.test(refEntity) || refEntity.length > 5;
    let refRegisterFailed = !['O', 'OH', 'S', 'T'].includes(refRegister);
    let refNoFailed = !onlyNumbers.test(refNo) || refNo.length > 5 || +refNo === 0;
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
      let caseResource = {
        id: selectedCase?.id,
        ref: {
          entity: refEntity,
          register: refRegister,
          number: refNo,
          year: refYear,
        },
        type: caseType,
        parties: caseParties,
        area: caseArea,
        status: caseStatus,
        statusNote: caseStatusNote,
        memo: caseMemo,
        markerColor: caseMarkerColor,
        receivedOn: nullIfEmpty(caseReceivedOn),
        settledOn: nullIfEmpty(caseSettledOn),
        dueDate: nullIfEmpty(caseDueDate),
        todoDate: nullIfEmpty(caseTodoDate),
      };

      setSaving(true);
      if (caseResource.id) {
        api.updateCase(caseResource)
          .then((response) => {
            close();
            forceUpdate(response.data);
          })
          .catch(saveErrorHandler);
      } else {
        api.persistCase(caseResource)
          .then((response) => {
            close();
            forceUpdate(response.data);
          })
          .catch(saveErrorHandler);
      }
    }
    e.preventDefault();
  }

  return (
    <ModalDialog isOpen={isOpen} onClose={close}>
      {/* use div instead of Dialog.Panel, removes the onClose handler when clicked outside */}
      <div className={clsx('py-6 w-full min-w-[322px] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-4xl xl:max-w-6xl',
        'transform transition-all overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl',
        fieldsDisabled && 'cursor-wait')}
      >
        <form onSubmit={saveCase} className="px-6 max-h-[85vh] overflow-y-auto overflow-x-visible overscroll-contain no-scrollbar">
          <Dialog.Title as="h3" className="text-lg font-semibold leading-6 tracking-tight sm:tracking-normal text-stone-900 sticky top-0 bg-white pb-4 z-50">
            {selectedCase ? `Verfahren ${selectedCase.ref.value} bearbeiten` : 'Neues Verfahren'}
          </Dialog.Title>
          <FailureAlert message={errorOnLoad} className="w-full mb-4" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-6 lg:grid-cols-4 w-full pb-1">
            <div className="sm:col-span-4 lg:col-span-2 xl:col-span-1">
              <label className="block">Aktenzeichen</label>
              <div className="block w-fit rounded-lg border border-stone-300">
                <input
                  minLength="1"
                  maxLength="4"
                  tabIndex="1"
                  inputMode="numeric"
                  disabled={fieldsDisabled}
                  value={refEntity}
                  onKeyDown={(e) => focusNextOnKey(e, ' ', refRegisterInput)}
                  onPaste={pasteReference}
                  onChange={(e) => setRefEntity(e.target.value.trim())}
                  className={`mr-1 w-16 border-0 rounded-l-lg focus:ring-2 focus:ring-teal-700 disabled:cursor-wait ${refEntityFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                />
                <input
                  minLength="1"
                  maxLength="2"
                  tabIndex="2"
                  disabled={fieldsDisabled}
                  value={refRegister}
                  ref={refRegisterInput}
                  onKeyDown={(e) => focusNextOnKey(e, ' ', refNoInput)}
                  onChange={(e) => setRefRegister(e.target.value.trim().toUpperCase())}
                  className={`mr-1 w-12 border-0 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait ${refRegisterFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                />
                <input
                  minLength="1"
                  maxLength="4"
                  tabIndex="3"
                  inputMode="numeric"
                  disabled={fieldsDisabled}
                  value={refNo}
                  ref={refNoInput}
                  onKeyDown={(e) => focusNextOnKey(e, '/', refYearInput)}
                  onChange={(e) => setRefNo(e.target.value.trim())}
                  className={`w-16 border-0 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait ${refNoFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                />
                <span>/</span>
                <input
                  minLength="2"
                  maxLength="2"
                  tabIndex="4"
                  inputMode="numeric"
                  disabled={fieldsDisabled}
                  value={refYear}
                  ref={refYearInput}
                  onChange={(e) => setRefYear(e.target.value.trim())}
                  className={`w-12 border-0 rounded-r-lg focus:ring-2 focus:ring-teal-700 disabled:cursor-wait ${refYearFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                />
              </div>
            </div>
            <div className="sm:col-span-2 xl:col-span-1 sm:pt-2">
              <div className="flex items-center mb-4">
                <label className="text-sm font-medium">
                  <input
                    type="radio"
                    name="type"
                    value="SINGLE"
                    tabIndex="5"
                    disabled={fieldsDisabled}
                    checked={caseType === 'SINGLE'}
                    onChange={() => setCaseType('SINGLE')}
                    className={`size-4 mr-2 text-teal-700 border-stone-300 focus:ring-teal-700 focus:ring-2 disabled:cursor-wait ${caseTypeFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                  />
                  Einzelrichter
                </label>
              </div>
              <div className="flex items-center">
                <label className="text-sm font-medium">
                  <input
                    type="radio"
                    name="type"
                    value="CHAMBER"
                    tabIndex="5"
                    disabled={fieldsDisabled}
                    checked={caseType === 'CHAMBER'}
                    onChange={() => setCaseType('CHAMBER')}
                    className={`size-4 mr-2 text-teal-700 border-stone-300 focus:ring-teal-700 focus:ring-2 disabled:cursor-wait ${caseTypeFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
                  />
                  Kammersache
                </label>
              </div>
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="parties" className="block mb-2 text-sm font-medium">
                Parteien
              </label>
              <input
                id="parties"
                name="parties"
                value={caseParties}
                tabIndex="6"
                disabled={fieldsDisabled}
                onChange={(e) => setCaseParties(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="area" className="block mb-2 text-sm font-medium">
                Rechtsgebiet
              </label>
              <input
                id="area"
                name="area"
                tabIndex={xlWidth ? 8 : 7}
                disabled={fieldsDisabled}
                value={caseArea}
                onChange={(e) => setCaseArea(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-4 xl:col-span-2 xl:col-start-1 xl:row-start-2">
              <label htmlFor="status" className="block mb-2 text-sm font-medium">
                Status
              </label>
              <Listbox id="status" disabled={fieldsDisabled} value={caseStatus} onChange={setNewStatus}>
                {({ open }) => {
                  const buttonClasses = clsx('flex items-center p-2 w-full text-sm bg-stone-50',
                    'border border-stone-300 rounded-lg outline-none shadow-sm',
                    'focus:ring-teal-700 focus:ring-2 focus:border-teal-700',
                    open && 'ring-teal-700 ring-2 border-teal-700',
                    fieldsDisabled && 'cursor-wait');
                  const optionsClasses = clsx('absolute w-full lg:max-h-72 overflow-y-auto mt-0.5 py-2',
                    'z-20 bg-stone-50 border rounded-lg shadow shadow-stone-400 outline-none');
                  const optionClasses = clsx('flex items-center px-2 py-1',
                    'ui-active:!bg-teal-700 ui-active:text-white ui-selected:bg-stone-200');
                  return (
                    <div className="relative">
                      <Listbox.Button tabIndex={xlWidth ? 7 : 8} className={buttonClasses}>
                        <StatusIcon status={caseStatus} className="size-6 me-2 flex-none inline" />
                        <span className="flex-auto text-left">
                          {statusLabels[caseStatus]}
                        </span>
                        {open
                          ? <ChevronUpIcon className="size-4 flex-none" />
                          : <ChevronDownIcon className="size-4 flex-none" />}
                      </Listbox.Button>
                      <Listbox.Options className={optionsClasses}>
                        {statusKeys.map((status) => (
                          <Listbox.Option key={status} value={status} className={optionClasses}>
                            <StatusIcon status={status} className="size-6 me-2 flex-none inline" />
                            <span className="flex-auto text-sm text-left">
                              {statusLabels[status]}
                            </span>
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  );
                }}
              </Listbox>
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="statusNote" className="block mb-2 text-sm font-medium">
                Status-Notiz
              </label>
              <textarea
                id="statusNote"
                name="statusNote"
                rows="3"
                tabIndex="9"
                disabled={fieldsDisabled}
                value={caseStatusNote}
                onChange={(e) => setCaseStatusNote(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="caseMemo" className="block mb-2 text-sm font-medium">
                Anmerkung
              </label>
              <textarea
                id="caseMemo"
                name="caseMemo"
                rows="3"
                tabIndex="10"
                disabled={fieldsDisabled}
                value={caseMemo}
                onChange={(e) => setCaseMemo(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait"
              />
            </div>
            <div className="col-span-full flex gap-5">
              <label className="text-sm font-medium">Markierung</label>
              <div className="flex gap-3">
                {
                  markerColors.map((color) => (
                    <input
                      key={color}
                      type="radio"
                      name="markerColor"
                      value={color}
                      tabIndex="11"
                      disabled={fieldsDisabled}
                      checked={color === caseMarkerColor}
                      onChange={() => setCaseMarkerColor(color)}
                      className={`size-4 self-center marker ${color || 'none'} border-stone-300 focus:ring-teal-700 focus:ring-2 disabled:cursor-wait`}
                    />
                  ))
                }
              </div>
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="receivedOn" className="block mb-2 text-sm font-medium">
                Eingegangen am
              </label>
              <input
                id="receivedOn"
                name="receivedOn"
                type="date"
                tabIndex="12"
                disabled={fieldsDisabled}
                value={caseReceivedOn}
                onChange={(e) => setCaseReceivedOn(e.target.value)}
                onFocus={(e) => e.target.defaultValue = ''}
                className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait ${caseReceivedOnFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="settledOn" className="block mb-2 text-sm font-medium">
                Erledigt am
              </label>
              <input
                id="settledOn"
                name="settledOn"
                type="date"
                tabIndex="13"
                disabled={fieldsDisabled}
                value={caseSettledOn}
                onChange={(e) => setCaseSettledOn(e.target.value)}
                onFocus={(e) => e.target.defaultValue = ''}
                className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait ${caseSettledOnFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="todoDate" className="block mb-2 text-sm font-medium">
                Vorfrist am
              </label>
              <input
                id="todoDate"
                name="todoDate"
                type="date"
                tabIndex="14"
                disabled={fieldsDisabled}
                value={caseTodoDate}
                onChange={(e) => setCaseTodoDate(e.target.value)}
                onFocus={(e) => e.target.defaultValue = ''}
                className={`border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait ${caseTodoDateFailure ? 'bg-rose-100' : 'bg-stone-50'}`}
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="dueDate" className="block mb-2 text-sm font-medium">
                nächster Termin am
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                tabIndex="15"
                disabled={fieldsDisabled}
                value={caseDueDate}
                onChange={(e) => setCaseDueDate(e.target.value)}
                onFocus={(e) => e.target.defaultValue = ''}
                className="bg-stone-50 border border-stone-300 text-sm rounded-lg focus:ring-teal-700 focus:ring-2 focus:border-teal-700 block w-full p-2.5 disabled:cursor-wait"
              />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white pt-6 pb-1">
            <FailureAlert message={errorOnSave} className="col-span-full mb-6" />
            <div className="col-span-full flex justify-center gap-6">
              <button
                type="button"
                tabIndex="16"
                className="flex w-32 sm:w-40 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-stone-200 text-teal-700 shadow-sm hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus:ring-teal-700 focus:border-teal-700"
                onClick={close}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                tabIndex="17"
                disabled={fieldsDisabled || saving}
                className="flex w-32 sm:w-40 justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 bg-teal-700 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                {selectedCase ? 'Speichern' : 'Anlegen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}
