import { DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useMediaQuery } from '@uidotdev/usehooks';
import clsx from 'clsx/lite';
import { useContext, useEffect, useRef, useState } from 'react';

import { ApiContext } from './ApiContext';
import FailureAlert from './FailureAlert';
import ModalDialog from './ModalDialog';
import { statusKeys, statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { addDays, daysDiff, today } from './utils';

export default function EditModal({ close, selectedCase, forceUpdate }) {
  const api = useContext(ApiContext);

  const [refEntity, setRefEntity] = useState('');
  const [refRegister, setRefRegister] = useState('');
  const [refNo, setRefNo] = useState('');
  const [refYear, setRefYear] = useState('');
  const [caseType, setCaseType] = useState('');
  const [caseParties, setCaseParties] = useState('');
  const [caseArea, setCaseArea] = useState('');
  const [caseStatus, setCaseStatus] = useState(selectedCase.id ? '' : 'UNKNOWN');
  const [caseStatusNote, setCaseStatusNote] = useState('');
  const [caseMemo, setCaseMemo] = useState('');
  const [caseMarkerColor, setCaseMarkerColor] = useState('');
  const [caseReceivedOn, setCaseReceivedOn] = useState(selectedCase.id ? '' : today());
  const [caseSettledOn, setCaseSettledOn] = useState('');
  const [caseDueDateTime, setCaseDueDateTime] = useState('');
  const [caseTodoDate, setCaseTodoDate] = useState('');
  const [previousDueDate, setPreviousDueDate] = useState('');
  const [previousTodoDate, setPreviousTodoDate] = useState('');
  const [todoDateEdited, setTodoDateEdited] = useState(false);

  const [refEntityFailure, setRefEntityFailure] = useState(false);
  const [refRegisterFailure, setRefRegisterFailure] = useState(false);
  const [refNoFailure, setRefNoFailure] = useState(false);
  const [refYearFailure, setRefYearFailure] = useState(false);
  const [caseTypeFailure, setCaseTypeFailure] = useState(false);
  const [caseReceivedOnFailure, setCaseReceivedOnFailure] = useState(false);
  const [caseSettledOnFailure, setCaseSettledOnFailure] = useState(false);

  const refRegisterInput = useRef();
  const refNoInput = useRef();
  const refYearInput = useRef();

  const [fieldsDisabled, setFieldsDisabled] = useState(!!selectedCase.id);
  const [errorOnLoad, setErrorOnLoad] = useState('');
  const [errorOnSave, setErrorOnSave] = useState('');
  const [saving, setSaving] = useState(false);

  const lgWidth = useMediaQuery('(min-width: 1024px)');

  // see index.css for corresponding CSS colors
  const markerColors = ['', 'gray', 'red', 'yellow', 'green', 'blue', 'purple'];

  useEffect(() => {
    if (selectedCase.id) {
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
          setCaseDueDateTime(caseResource.dueDate ? `${caseResource.dueDate}T${caseResource.dueTime ?? '00:00'}` : '');
          setCaseTodoDate(caseResource.todoDate ?? '');
          setPreviousDueDate(caseResource.dueDate ?? '');
          setPreviousTodoDate(caseResource.todoDate ?? '');
          setFieldsDisabled(false);
        })
        .catch((error) => setErrorOnLoad(error.userMessage));
    }
  }, [api, selectedCase]);

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

  function changeTodoDate(newDate) {
    setCaseTodoDate(newDate);
    setTodoDateEdited(true);
  }

  function changeDueDate(newDateTime) {
    setCaseDueDateTime(newDateTime);
    const [newDate] = newDateTime ? newDateTime.split('T') : [''];
    if (!todoDateEdited) {
      if (previousDueDate && previousTodoDate) {
        const days = daysDiff(previousDueDate, newDate);
        setCaseTodoDate(addDays(previousTodoDate, days));
      }
      if (!previousDueDate && !previousTodoDate) {
        setCaseTodoDate(newDate);
      }
    }
  }

  function clearDueDate() {
    setCaseDueDateTime('');
    setCaseTodoDate('');
    setPreviousDueDate('');
    setPreviousTodoDate('');
    setTodoDateEdited(false);
  }

  function dateEdit(event, dateTime, setDateTime) {
    const [date, time] = dateTime.split('T');
    const timeSuffix = time ? `T${time}` : '';
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        date && setDateTime(addDays(date, 1) + timeSuffix);
        break;
      case 'ArrowDown':
        event.preventDefault();
        date && setDateTime(addDays(date, -1) + timeSuffix);
        break;
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
    let [caseDueDate, caseDueTime] = caseDueDateTime ? caseDueDateTime.split('T') : ['', ''];
    let todoDate = caseTodoDate || caseDueDate;
    setCaseTodoDate(todoDate);

    setRefEntityFailure(refEntityFailed);
    setRefRegisterFailure(refRegisterFailed);
    setRefNoFailure(refNoFailed);
    setRefYearFailure(refYearFailed);
    setCaseTypeFailure(caseTypeFailed);
    setCaseReceivedOnFailure(caseReceivedOnFailed);
    setCaseSettledOnFailure(caseSettledOnFailed);

    let validationFailed = refEntityFailed || refRegisterFailed || refNoFailed || refYearFailed || caseTypeFailed || caseReceivedOnFailed || caseSettledOnFailed;
    if (!validationFailed) {
      let caseResource = {
        id: selectedCase.id,
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
        dueTime: nullIfEmpty(caseDueTime),
        todoDate: nullIfEmpty(todoDate),
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
    <ModalDialog onClose={close}>
      {/* use div instead of DialogPanel, removes the onClose handler when clicked outside */}
      <div
        className="w-full max-w-md min-w-[322px] transform overflow-hidden rounded-2xl bg-white py-6 text-left align-middle shadow-xl transition-all sm:max-w-lg md:max-w-xl lg:max-w-4xl xl:max-w-6xl"
      >
        <form
          onSubmit={saveCase}
          className={clsx(
            'no-scrollbar overflow-x-visible overflow-y-auto overscroll-contain',
            fieldsDisabled && 'cursor-wait',
          )}
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
          autoComplete="off"
        >
          <DialogTitle
            as="h3"
            className="sticky top-0 z-50 bg-white px-6 pb-4 text-lg leading-6 font-semibold tracking-tight text-stone-900 sm:tracking-normal"
          >
            {selectedCase.id ? `Verfahren ${selectedCase.ref.value} bearbeiten` : 'Neues Verfahren'}
          </DialogTitle>
          <FailureAlert message={errorOnLoad} className="mx-6 mb-4" />
          <div className="grid w-full grid-cols-1 gap-6 px-6 py-1 sm:grid-cols-6 lg:grid-cols-4">
            <div className="sm:col-span-4 md:col-span-3 lg:col-span-2">
              <label className="mb-2 block text-sm font-medium">Aktenzeichen</label>
              <div className="block w-fit rounded-md border border-stone-300">
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
                  className={clsx(
                    'mr-1 w-16 rounded-l-md border-none text-sm focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    refEntityFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
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
                  className={clsx(
                    'mr-1 w-12 border-none text-sm focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    refRegisterFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
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
                  className={clsx(
                    'w-16 border-none text-sm focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    refNoFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
                />
                <span className="text-sm">/</span>
                <input
                  minLength="2"
                  maxLength="2"
                  tabIndex="4"
                  inputMode="numeric"
                  disabled={fieldsDisabled}
                  value={refYear}
                  ref={refYearInput}
                  onChange={(e) => setRefYear(e.target.value.trim())}
                  className={clsx(
                    'w-12 rounded-r-md border-none text-sm focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    refYearFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
                />
              </div>
            </div>
            <div className="flex sm:col-span-2 sm:block md:col-span-3 lg:col-span-1">
              <label className="flex basis-1/2 items-center text-sm font-medium sm:mb-4">
                <input
                  type="radio"
                  name="type"
                  value="SINGLE"
                  tabIndex="5"
                  disabled={fieldsDisabled}
                  checked={caseType === 'SINGLE'}
                  onChange={() => setCaseType('SINGLE')}
                  className={clsx(
                    'mr-2 size-4 border-stone-300 text-teal-700 checked:border-teal-700 checked:bg-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    caseTypeFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
                />
                Einzelrichter
              </label>
              <label className="flex basis-1/2 items-center text-sm font-medium">
                <input
                  type="radio"
                  name="type"
                  value="CHAMBER"
                  tabIndex="5"
                  disabled={fieldsDisabled}
                  checked={caseType === 'CHAMBER'}
                  onChange={() => setCaseType('CHAMBER')}
                  className={clsx(
                    'mr-2 size-4 border-stone-300 text-teal-700 checked:border-teal-700 checked:bg-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                    caseTypeFailure ? 'bg-rose-100' : 'bg-stone-50',
                  )}
                />
                Kammersache
              </label>
            </div>
            <div className="col-span-full flex gap-5 lg:col-span-1 lg:block">
              <label className="block text-sm font-medium lg:mb-4">Markierung</label>
              <div className="flex h-5 gap-3">
                {
                  markerColors.map((color) => (
                    <input
                      key={color}
                      type="radio"
                      name="markerColor"
                      value={color}
                      tabIndex="6"
                      disabled={fieldsDisabled}
                      checked={color === caseMarkerColor}
                      onChange={() => setCaseMarkerColor(color)}
                      className={clsx(
                        'marker size-4 self-center border-stone-300 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                        color || 'none',
                      )}
                    />
                  ))
                }
              </div>
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="parties" className="mb-2 block text-sm font-medium">
                Parteien
              </label>
              <input
                id="parties"
                name="parties"
                value={caseParties}
                tabIndex="7"
                disabled={fieldsDisabled}
                onChange={(e) => setCaseParties(e.target.value)}
                className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-4">
              <label htmlFor="area" className="mb-2 block text-sm font-medium">
                Rechtsgebiet
              </label>
              <input
                id="area"
                name="area"
                tabIndex={lgWidth ? 9 : 8}
                disabled={fieldsDisabled}
                value={caseArea}
                onChange={(e) => setCaseArea(e.target.value)}
                className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-2 lg:col-start-3 lg:row-start-2">
              <label htmlFor="status" className="mb-2 block text-sm font-medium">
                Status
              </label>
              <Listbox id="status" disabled={fieldsDisabled} value={caseStatus} onChange={setNewStatus}>
                {({ open }) => (
                  <div className="relative">
                    <ListboxButton
                      tabIndex={lgWidth ? 8 : 9}
                      className={clsx(
                        'flex w-full items-center rounded-md border border-stone-300 bg-stone-50 p-2 text-sm shadow-xs outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-700',
                        open && 'border-teal-700 ring-2 ring-teal-700',
                        fieldsDisabled && 'cursor-wait',
                      )}
                    >
                      <StatusIcon status={caseStatus} className="me-2 inline size-6 flex-none" />
                      <span className="flex-auto text-left">
                        {statusLabels[caseStatus]}
                      </span>
                      {open
                        ? <ChevronUpIcon className="size-4 flex-none" />
                        : <ChevronDownIcon className="size-4 flex-none" />}
                    </ListboxButton>
                    <ListboxOptions
                      className="absolute z-20 mt-0.5 w-full overflow-y-auto rounded-md border bg-stone-50 py-2 shadow-sm shadow-stone-400 outline-hidden lg:max-h-72"
                    >
                      {statusKeys.map((status) => (
                        <ListboxOption
                          key={status}
                          value={status}
                          className="flex items-center px-2 py-1 data-focus:bg-teal-700! data-focus:text-white data-selected:bg-stone-200"
                        >
                          <StatusIcon status={status} className="me-2 inline size-6 flex-none" />
                          <span className="flex-auto text-left text-sm">
                            {statusLabels[status]}
                          </span>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                )}
              </Listbox>
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="todoDate" className="mb-2 block text-sm font-medium">
                Vorfrist am
              </label>
              <input
                id="todoDate"
                name="todoDate"
                type="date"
                tabIndex="10"
                disabled={fieldsDisabled}
                value={caseTodoDate}
                onChange={(e) => changeTodoDate(e.target.value)}
                onFocus={(e) => (e.target.defaultValue = '')}
                onKeyDown={(e) => dateEdit(e, caseTodoDate, changeTodoDate)}
                className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <div className="flex justify-between">
                <label htmlFor="dueDate" className="mb-2 text-sm font-medium">
                  nächster Termin am
                </label>
                <XMarkIcon className="size-5 hover:text-teal-700" onClick={clearDueDate} />
              </div>
              <div className="relative">
                <input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  tabIndex="11"
                  disabled={fieldsDisabled}
                  value={caseDueDateTime}
                  onChange={(e) => changeDueDate(e.target.value)}
                  onFocus={(e) => (e.target.defaultValue = '')}
                  onKeyDown={(e) => dateEdit(e, caseDueDateTime, changeDueDate)}
                  className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
                />
              </div>
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="receivedOn" className="mb-2 block text-sm font-medium">
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
                onFocus={(e) => (e.target.defaultValue = '')}
                onKeyDown={(e) => dateEdit(e, caseReceivedOn, setCaseReceivedOn)}
                className={clsx(
                  'block w-full rounded-md border border-stone-300 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                  caseReceivedOnFailure ? 'bg-rose-100' : 'bg-stone-50',
                )}
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <label htmlFor="settledOn" className="mb-2 block text-sm font-medium">
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
                onFocus={(e) => (e.target.defaultValue = '')}
                onKeyDown={(e) => dateEdit(e, caseSettledOn, setCaseSettledOn)}
                className={clsx(
                  'block w-full rounded-md border border-stone-300 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait',
                  caseSettledOnFailure ? 'bg-rose-100' : 'bg-stone-50',
                )}
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="statusNote" className="mb-2 block text-sm font-medium">
                Status-Notiz
              </label>
              <textarea
                id="statusNote"
                name="statusNote"
                rows="3"
                tabIndex="14"
                disabled={fieldsDisabled}
                value={caseStatusNote}
                onChange={(e) => setCaseStatusNote(e.target.value)}
                className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
              />
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label htmlFor="caseMemo" className="mb-2 block text-sm font-medium">
                Anmerkung
              </label>
              <textarea
                id="caseMemo"
                name="caseMemo"
                rows="3"
                tabIndex="15"
                disabled={fieldsDisabled}
                value={caseMemo}
                onChange={(e) => setCaseMemo(e.target.value)}
                className="block w-full rounded-md border border-stone-300 bg-stone-50 p-2.5 text-sm focus:border-teal-700 focus:ring-2 focus:ring-teal-700 disabled:cursor-wait"
              />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white pt-6 pb-1">
            <FailureAlert message={errorOnSave} className="mx-6 mb-6" />
            <div className="col-span-full flex justify-center gap-6 px-6">
              <button
                type="button"
                tabIndex="16"
                className="flex w-32 justify-center rounded-md bg-stone-200 px-3 py-1.5 text-sm leading-6 font-semibold text-teal-700 shadow-xs hover:bg-stone-100 focus:border-teal-700 focus:ring-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:w-40"
                onClick={close}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                tabIndex="17"
                disabled={fieldsDisabled || saving}
                className="flex w-32 justify-center rounded-md bg-teal-700 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-40"
              >
                {selectedCase.id ? 'Speichern' : 'Anlegen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}
