import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { ChevronLeftIcon, PaperClipIcon } from '@heroicons/react/20/solid';
import {
  ArrowDownOnSquareIcon,
  ArrowPathIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { useDebounce } from '@uidotdev/usehooks';
import clsx from 'clsx/lite';
import { useContext, useEffect, useRef, useState } from 'react';
import { ApiContext } from './ApiProvider';
import AutoLink from './AutoLink';
import DeleteModal from './DeleteModal';
import EditModal from './EditModal';
import FailureAlert from './FailureAlert';
import FileUploadModal from './FileUploadModal';
import { SettledIcon } from './Icons';
import RtfImportModal from './RtfImportModal';
import { statusKeys, statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { single, startOfWeek, today } from './utils';

const typeMap = {
  CHAMBER: 'K',
  SINGLE: 'ER',
};
const typeKeys = Object.keys(typeMap);

const typeLabels = {
  CHAMBER: 'Kammersache',
  SINGLE: 'Einzelrichter',
};

const filterStatusKeys = statusKeys.filter((value) => value !== 'SETTLED');

function ignoreDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

export default function Content() {
  const api = useContext(ApiContext);

  const [cases, setCases] = useState(null);
  const [filteredCases, setFilteredCases] = useState(null);
  const [search, setSearch] = useState('');
  const [statusQuery, setStatusQuery] = useState([]);
  const [typeQuery, setTypeQuery] = useState([]);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [todosOnly, setTodosOnly] = useState(false);
  const [settledOnly, setSettledOnly] = useState(false);
  const [reloadCases, setReloadCases] = useState(true);
  const [reloadDocuments, setReloadDocuments] = useState(true);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState();
  const [loading, setLoading] = useState(false);
  const delayedLoading = useDebounce(loading, 1000);
  const [forceSpinner, setForceSpinner] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const searchRef = useRef(null);

  const loadingSpinner = (loading && delayedLoading) || forceSpinner;

  useEffect(() => {
    setLoading(true);
    // in the API, type is a single nullable parameter (i.e. SINGLE or CHAMBER or null)
    api.getCases(statusQuery, typeQuery.length === 1 ? typeQuery[0] : null, settledOnly)
      .then((response) => {
        setCases(response.data?.cases);
        setLoading(false);
        setForceSpinner(false);
        setErrorMessage('');
        // remove the animation css class after about 1.5s (duration of delay + animation, see tailwind.config.js)
        setTimeout(() => setRecentlyUpdatedId(undefined), 1600);
      })
      .catch((error) => setErrorMessage(error.userMessage));
  }, [api, reloadCases, statusQuery, typeQuery, settledOnly]);

  useEffect(() => {
    if (!cases) {
      return;
    }

    let newCases;
    if (todosOnly && !settledOnly) {
      newCases = cases.filter((c) => c.todoDate)
        .filter((c) => containsSearch(c, search))
        .sort((c1, c2) => c1.todoDate.localeCompare(c2.todoDate))
        .map((c) => Object.assign({}, c));
      let recentWeek = null;
      let recentTodo = null;
      let emptyWeeks = [];
      for (let i = 0; i < newCases.length; i++) {
        let c = newCases[i];
        if (c.todoWeekOfYear && c.todoWeekOfYear !== recentWeek) {
          c.newWeek = true;
          if (recentWeek && recentTodo) {
            // determine missing (empty) weeks
            for (let j = 1; j < c.todoWeekOfYear - recentWeek; j++) {
              emptyWeeks.push({
                casesIndex: i,
                weekOfYear: recentWeek + j,
                startOfWeek: startOfWeek(recentTodo, j),
              });
            }
          }
          recentWeek = c.todoWeekOfYear;
          recentTodo = c.todoDate;
        }
      }
      // add placeholder entries for empty weeks into cases list
      for (let i = emptyWeeks.length - 1; i >= 0; i--) {
        const e = emptyWeeks[i];
        newCases = [
          ...newCases.slice(0, e.casesIndex),
          {
            id: `week${e.weekOfYear}`, // required field (used as react key)
            todoWeekOfYear: e.weekOfYear,
            todoDate: e.startOfWeek,
            newWeek: true,
          },
          ...newCases.slice(e.casesIndex)];
      }
    } else {
      newCases = cases.filter((c) => containsSearch(c, search));
    }
    setFilteredCases(newCases.map((c) => {
      if (c.id === recentlyUpdatedId) {
        c.recentlyUpdated = true;
      }
      return c;
    }));
  }, [cases, todosOnly, settledOnly, search, recentlyUpdatedId]);

  // pull to refresh on mobile devices (tested on iOS only)
  useEffect(() => {
    const onTouchEnd = () => {
      if (window.scrollY <= -100) { // screen has been "overscrolled", is this a standard behavior?
        setForceSpinner(true);
        setTimeout(forceUpdate, 500);
      }
    };

    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  function containsSearch(aCase, search) {
    search = search.trim().toLowerCase();
    if (search === '') {
      return true;
    }
    const searchItems = search.split(' ').filter((s) => s !== '');
    const props = ['parties', 'area', 'caseMemo', 'statusNote'];
    return searchItems.every((s) => {
      for (const prop of props) {
        if (aCase[prop] && aCase[prop].toLowerCase().indexOf(s) !== -1) {
          return true;
        }
      }
      return aCase.ref.value.toLowerCase().indexOf(s) !== -1;
    });
  }

  function forceUpdate(updated) {
    setReloadCases((b) => !b);
    setRecentlyUpdatedId(updated?.id);
  }

  function logout() {
    api.logout();
  }

  function openEditModal(event, aCase) {
    ignoreDefaults(event);
    setSelectedCase(aCase);
    setEditOpen(true);
  }

  function openUploadModal(aCase) {
    setSelectedCase(aCase);
    setUploadOpen(true);
  }

  function openDeleteModal(aCase) {
    setSelectedCase(aCase);
    setDeleteOpen(true);
  }

  return (
    <>
      {/* modals */}
      <EditModal isOpen={isEditOpen} setIsOpen={setEditOpen} selectedCase={selectedCase} forceUpdate={forceUpdate} />

      <RtfImportModal isOpen={isImportOpen} setIsOpen={setImportOpen} forceUpdate={forceUpdate} />
      <FileUploadModal isOpen={isUploadOpen} setIsOpen={setUploadOpen} selectedCase={selectedCase} forceUpdate={() => setReloadDocuments((b) => !b)} />

      <DeleteModal isOpen={isDeleteOpen} setIsOpen={setDeleteOpen} selectedCase={selectedCase} forceUpdate={forceUpdate} />

      {/* header */}
      <div className="mb-8 flex flex-row justify-between items-baseline border-b-2 border-b-stone-400 border-solid">
        <div className="mb-2 flex flex-row justify-start items-baseline">
          <img src="/logo.svg" alt="Logo" className="mr-2 my-auto size-5" />
          <span className="font-kaushanScript text-lg">Causalist</span>
        </div>
        { // responsiveness helper (development only)
          process.env.NODE_ENV === 'development' && (
            <div className="text-white bg-rose-700 font-bold text-sm px-4 py-1 rounded-full">
              <span className="sm:hidden">xs</span>
              <span className="hidden sm:inline md:hidden">sm</span>
              <span className="hidden md:inline lg:hidden">md</span>
              <span className="hidden lg:inline xl:hidden">lg</span>
              <span className="hidden xl:inline 2xl:hidden">xl</span>
              <span className="hidden 2xl:inline 3xl:hidden">2xl</span>
            </div>
          )
        }
        <div className="mb-2">
          <button className="text-teal-700 hover:text-teal-800 hover:underline" onClick={logout}>
            Abmelden
          </button>
        </div>
      </div>

      {/* filter */}
      <div className="mb-8 flex flex-row justify-between">
        <div className="flex flex-row flex-wrap gap-5 justify-between md:justify-start w-full ">
          <TypeFilter typeQuery={typeQuery} setTypeQuery={setTypeQuery} />

          <StatusFilter statusQuery={statusQuery} setStatusQuery={setStatusQuery} settledOnly={settledOnly} />

          {/* search input */}
          {/* h-[42px] -> same height as status filter button row */}
          <div className="inline-flex flex-1 sm:order-last md:order-none relative h-[42px]">
            <input
              type="text"
              placeholder="Suche"
              value={search}
              ref={searchRef}
              className="block w-full min-w-20 pr-8 bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-md focus:ring-teal-700 focus:border-teal-700"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
            />
            <div
              className="absolute bottom-0 top-0 right-0 pr-2.5 py-3 text-stone-600 hover:text-stone-900"
              title="Leeren"
              onClick={() => {
                setSearch('');
                searchRef.current.focus();
              }}
            >
              <XMarkIcon className="size-5" />
            </div>
          </div>

          <div className="hidden xl:block flex-1">{/* spacer */}</div>

          <div className="inline-flex rounded-md shadow-sm">
            {/* new case button */}
            <div className="inline-flex">
              <button
                className="flex w-full items-center rounded-md sm:rounded-r-none px-3 py-2 text-sm font-semibold leading-6 bg-teal-700 text-white border-r border-white hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                onClick={openEditModal}
              >
                <PlusCircleIcon className="size-6 inline" />
                <span className="ms-2 lg:inline hidden">Neu</span>
              </button>
            </div>
            {/* rtf upload */}
            <div className="hidden sm:inline-flex">
              <button
                className="flex w-full items-center rounded-r-md bg-teal-700 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                onClick={() => setImportOpen(true)}
              >
                <ArrowDownOnSquareIcon className="size-6 inline" />
                <span className="ms-2 lg:inline hidden">RTF Import</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* alert */}
      <FailureAlert message={errorMessage} className="mb-8" />

      {/* cases select and date checkbox */}
      <div className="flex flex-row justify-between align-baseline">
        <Listbox value={settledOnly} onChange={setSettledOnly}>
          <div className="relative">
            <ListboxButton
              className="text-lg font-semibold mb-2 focus-visible:outline-none focus-visible:underline hover:underline decoration-teal-700"
            >
              {settledOnly ? 'Erledigte Verfahren' : `${filteredCases ? filteredCases.length : ''} Laufende Verfahren`}
              <ChevronDownIcon className="inline ui-open:hidden size-5 ml-1" />
              <ChevronUpIcon className="hidden ui-open:inline size-5 ml-1" />
            </ListboxButton>
            <ListboxOptions
              className="absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
            >
              <ListboxOption
                value={false}
                className={({ focus }) =>
                  clsx('relative cursor-default select-none py-2 px-4', focus ? 'bg-stone-100 text-teal-700' : 'text-stone-900')}
              >
                Laufende Verfahren
              </ListboxOption>
              <ListboxOption
                value={true}
                className={({ focus }) =>
                  clsx('relative cursor-default select-none py-2 px-4', focus ? 'bg-stone-100 text-teal-700' : 'text-stone-900')}
              >
                Erledigte Verfahren
              </ListboxOption>
            </ListboxOptions>
          </div>
        </Listbox>

        <label className={settledOnly ? 'hidden' : 'flex'}>
          <input
            type="checkbox"
            className="self-center size-4 mr-2 rounded text-teal-700 bg-stone-50 border-stone-300 focus:ring-teal-700 focus:ring-2"
            checked={todosOnly}
            onChange={() => setTodosOnly((t) => !t)}
          />
          <span className="self-center pr-2">Fristen</span>
        </label>
      </div>

      {/* loading spinner */}
      {loadingSpinner && (
        <div className="relative">
          <ArrowPathIcon className="absolute top-1 w-full mx-auto size-8 animate-spin" />
        </div>
      )}

      {/* cases table */}
      <CasesList
        cases={filteredCases}
        loadingSpinner={loadingSpinner}
        recentlyUpdatedId={recentlyUpdatedId}
        openEditModal={openEditModal}
        openUploadModal={openUploadModal}
        openDeleteModal={openDeleteModal}
        reloadDocuments={reloadDocuments}
        setReloadDocuments={setReloadDocuments}
        forceUpdate={forceUpdate}
      />
    </>
  );
}

function TypeFilter({ typeQuery, setTypeQuery }) {
  const buttonClasses = clsx('p-2 w-11 text-sm font-semibold text-stone-900 hover:text-teal-700',
    'border border-r-0 border-stone-300 last:border-r first:rounded-l-md last:rounded-r-md',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus-visible:z-10',
    'data-selected:text-white data-selected:bg-teal-700 data-selected:hover:bg-teal-600');

  function toggleType(type) {
    setTypeQuery((tq) => {
      const typeSet = new Set(tq);
      if (typeSet.has(type)) {
        typeSet.delete(type);
      } else {
        typeSet.add(type);
      }
      return [...typeSet];
    });
  }

  function forceType(type) {
    setTypeQuery((tq) => {
      const newTypeQuery = [];
      if (tq.length === 0 || (tq.length === 1 && tq[0] === type)) {
        typeKeys.filter((t) => t !== type).forEach((t) => newTypeQuery.push(t));
      } else {
        newTypeQuery.push(type);
      }
      return newTypeQuery;
    });
  }

  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {
        typeKeys.map((type) => (
          <button
            type="button"
            key={type}
            data-selected={typeQuery.includes(type)}
            title={typeLabels[type]}
            className={buttonClasses}
            onClick={() => toggleType(type)}
            onDoubleClick={() => forceType(type)}
          >
            {typeMap[type]}
          </button>
        ))
      }
    </div>
  );
}

function StatusFilter({ statusQuery, setStatusQuery, settledOnly }) {
  const buttonClasses = clsx('p-2 w-full text-stone-900 hover:text-teal-700',
    'border border-r-0 last:border-r border-stone-300 first:rounded-l-md last:rounded-r-md',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 focus-visible:z-10',
    'data-selected:text-white data-selected:bg-teal-700 data-selected:hover:bg-teal-600',
    'disabled:!text-stone-900 disabled:!bg-white disabled:opacity-40 disabled:cursor-not-allowed');

  function toggleStatus(status) {
    setStatusQuery((sq) => {
      const statusSet = new Set(sq);
      if (statusSet.has(status)) {
        statusSet.delete(status);
      } else {
        statusSet.add(status);
      }
      return [...statusSet];
    });
  }

  function forceStatus(status) {
    setStatusQuery((sq) => {
      const newStatusQuery = [];
      if (sq.length === 0 || (sq.length === 1 && sq[0] === status)) {
        statusKeys.filter((s) => s !== status).forEach((s) => newStatusQuery.push(s));
      } else {
        newStatusQuery.push(status);
      }
      return newStatusQuery;
    });
  }

  return (
    <div className="inline-flex rounded-md shadow-sm order-first sm:order-none w-full sm:w-auto" role="group">
      {
        filterStatusKeys.map((status) => (
          <button
            type="button"
            key={status}
            disabled={settledOnly}
            data-selected={statusQuery.includes(status)}
            title={statusLabels[status]}
            className={buttonClasses}
            onClick={() => toggleStatus(status)}
            onDoubleClick={() => forceStatus(status)}
          >
            <StatusIcon status={status} className="size-6 mx-auto" />
          </button>
        ))
      }
    </div>
  );
}

function CasesList({ cases, loadingSpinner, recentlyUpdatedId, openEditModal, openUploadModal, openDeleteModal, reloadDocuments, setReloadDocuments, forceUpdate }) {
  const api = useContext(ApiContext);

  const [openCaseId, setOpenCaseId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [clickedCaseId, setClickedCaseId] = useState(null);
  const singleClickedCaseId = useDebounce(clickedCaseId, 300);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (openCaseId && (recentlyUpdatedId || !cases.map((c) => c.id).includes(openCaseId))) {
      setOpenCaseId(null);
    }
  }, [cases, recentlyUpdatedId, openCaseId]);

  useEffect(() => {
    if (singleClickedCaseId && clickedCaseId && singleClickedCaseId === clickedCaseId) {
      setOpenCaseId((o) => o === clickedCaseId ? null : clickedCaseId);
      setOpenDropdown(null);
      setClickedCaseId(null);
      setDocuments([]);
    }
  }, [clickedCaseId, singleClickedCaseId]);

  useEffect(() => {
    if (!cases || !openCaseId) {
      return;
    }

    setSelectedDocumentId(null);
    setErrorMessage(null);

    let openCase = single(cases.filter((c) => c.id === openCaseId));
    if (openCase && openCase.hasDocuments) {
      api.getCaseDocuments(openCase.id)
        .then((response) => {
          setDocuments(response.data.documents);
          openCase.hasDocuments = (response.data.documents.length > 0);
        })
        .catch((error) => setErrorMessage(error.userMessage));
    } else {
      setDocuments([]);
    }
  }, [api, cases, openCaseId, reloadDocuments]);

  function clickCase(event, id) {
    setClickedCaseId((c) => {
      // on double-click (c === id): reset clickedCaseId
      // on text selection: don't set clickedCaseId
      return (c === id || window.getSelection()?.type === 'Range') ? null : id;
    });
  }

  function toggleDropdown(event, id) {
    event.stopPropagation();
    setOpenDropdown((o) => o === id ? null : id);
  }

  function openUpload(event, aCase) {
    event.stopPropagation();
    setOpenDropdown(null);
    openUploadModal(aCase);
  }

  function settleCase(event, aCase) {
    event.stopPropagation();
    aCase.status = 'SETTLED';
    aCase.settledOn = today();
    api.updateCase(aCase).then((response) => forceUpdate(response.data));
  }

  function openDelete(event, aCase) {
    event.stopPropagation();
    setOpenDropdown(null);
    openDeleteModal(aCase);
  }

  function downloadDocument(event, id, docId, filename) {
    ignoreDefaults(event);
    api.downloadCaseDocument(id, docId).then((response) => {
      const href = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }).catch((error) => {
      if (error.response.status === 404) {
        setErrorMessage(`Hmm, es gibt zwar einen Eintrag für ${filename}, aber das Dokument selbst ist nicht mehr da. 😕`);
      } else {
        setErrorMessage(error.userMessage);
      }
    });
  }

  function selectDocument(event, docId) {
    event.stopPropagation();
    setSelectedDocumentId(docId);
  }

  function deleteDocument(event, caseId, docId) {
    event.stopPropagation();
    api.deleteCaseDocument(caseId, docId).then(() => {
      setReloadDocuments((b) => !b);
    }).catch((error) => setErrorMessage(error.userMessage));
  }

  function formattedDate(date) {
    return date && new Date(date).toLocaleDateString();
  }

  function formattedDateTime(date) {
    let d = date && new Date(date);
    return d && (d.toLocaleDateString() + ' ' + d.toLocaleTimeString());
  }

  function todoBg(aCase) {
    if (isSettled(aCase)) {
      return '';
    }

    const date = aCase.todoDate;
    const now = new Date();
    const due = (date && new Date(date)) || now;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (date && (due < now)) {
      return 'bg-rose-50';
    } else if (date && (due < new Date(now.getTime() + oneWeek))) {
      return 'bg-amber-50';
    } else {
      return '';
    }
  }

  function isSettled(aCase) {
    return aCase.status === 'SETTLED';
  }

  if (!cases) {
    return null;
  }

  const olClasses = clsx('grid grid-cols-cases md:grid-cols-cases-md lg:grid-cols-cases-lg',
    loadingSpinner && 'opacity-25');
  const editButtonClasses = clsx('flex items-center w-full px-3 py-2 rounded-l-md leading-4 text-sm font-semibold',
    'text-white shadow-sm bg-teal-700 hover:bg-teal-600 border-r-white border-r',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700');
  const menuItemsClasses = 'border border-stone-300 border-b-0 last:border-b first:rounded-t-md last:rounded-b-md';
  const menuItemButtonClasses = 'flex items-center w-full px-3 py-2 leading-4 text-sm font-semibold bg-white hover:bg-stone-100';
  return (
    <ol className={olClasses}>
      {cases.length === 0 && (
        <li className="col-span-full text-stone-600 py-2 border-y border-y-stone-50">
          Du hast keine Verfahren für die aktuellen Filter- und Suchkriterien.
        </li>
      )}
      {cases.map((aCase) => {
        const liClasses = clsx('col-span-full grid grid-cols-subgrid border-y border-y-stone-50',
          'data-open:border-y-stone-700 data-open:hover:border-y-teal-700 data-open:hover:text-stone-900 hover:text-teal-700',
          aCase.ref && 'hover:border-y-stone-300 cursor-pointer data-open:cursor-auto pt-2.5 pb-1.5', todoBg(aCase),
          recentlyUpdatedId && aCase.recentlyUpdated && 'animate-updated',
          aCase.newWeek && 'relative mt-20 first:mt-8 border-t-teal-700');
        const weekMarkerClasses = 'absolute -top-6 right-0 py-1 px-7 text-xs bg-teal-700 text-white rounded-t-lg';
        return (
          <li
            key={aCase.id}
            data-open={openCaseId === aCase.id}
            className={liClasses}
            onClick={(e) => clickCase(e, aCase.ref && aCase.id)}
            onDoubleClick={(e) => openEditModal(e, aCase.ref && aCase)}
          >
            {aCase.newWeek && (
              <div className={weekMarkerClasses}>
                {`KW ${aCase.todoWeekOfYear} vom ${formattedDate(startOfWeek(aCase.todoDate))}`}
              </div>
            )}
            {aCase.ref && ( // a case without ref is a placeholder for an empty week
              <>
                <div className="flex justify-end w-full items-baseline">
                  <span className={`ml-2 size-3 rounded-full marker ${aCase.markerColor || 'none'}`}></span>
                  <span className="grow flex-none text-right">{aCase.ref.value}</span>
                  <span className="basis-4 flex-none text-left font-bold text-teal-600 text-xs ml-1 relative">
                    {typeMap[aCase.type]}
                    {aCase.hasDocuments && <PaperClipIcon className="text-stone-400 size-3.5 absolute left-0 -top-3" />}
                  </span>
                </div>
                <div title={statusLabels[aCase.status]}>
                  <StatusIcon status={aCase.status} className="size-6 mx-auto" />
                </div>
                <div
                  data-open={openCaseId === aCase.id}
                  className="px-2 whitespace-nowrap overflow-hidden text-ellipsis data-open:whitespace-normal data-open:md:mr-4"
                >
                  <span title={aCase.parties ? 'Parteien' : null}>{aCase.parties}</span>
                  <div className="md:hidden text-sm">
                    <span title={aCase.todoDate && 'Vorfrist'} className={!isSettled(aCase) && aCase.todoDate ? 'pr-4' : 'hidden'}>
                      {formattedDate(aCase.todoDate)}
                    </span>
                    <span
                      title={isSettled(aCase)
                        ? (aCase.settledOn && 'Erledigt am')
                        : (aCase.dueDate && 'nächster Termin')}
                      className="font-semibold empty:hidden"
                    >
                      {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                    </span>
                  </div>
                </div>
                <div
                  title={aCase.area ? 'Rechtsgebiet' : null}
                  data-open={openCaseId === aCase.id}
                  className="hidden lg:inline px-2 whitespace-nowrap overflow-hidden text-ellipsis data-open:whitespace-normal data-open:mr-4"
                >
                  {aCase.area}
                </div>
                <div title={!isSettled(aCase) && aCase.todoDate ? 'Vorfrist' : null} className="hidden lg:inline text-right pr-2">
                  {!isSettled(aCase) && formattedDate(aCase.todoDate)}
                </div>
                <div
                  title={isSettled(aCase) ? (aCase.settledOn && 'Erledigt am') : (aCase.dueDate && 'nächster Termin')}
                  className="hidden md:inline empty:hidden font-semibold text-right pr-2"
                >
                  {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                </div>
                <Transition
                  show={openCaseId === aCase.id}
                  appear
                >
                  <div className="col-span-full grid grid-cols-subgrid gap-y-4 pt-4 origin-top transition-all ease-out data-enter:duration-150 data-leave:duration-100 data-closed:opacity-0">
                    <div className="col-start-1 col-end-3 row-start-1 row-end-3 mx-2.5 relative">
                      <div className="flex justify-between items-center">
                        <button className={editButtonClasses} onClick={(e) => openEditModal(e, aCase)}>
                          <PencilIcon className="size-4 me-2 inline" />
                          Bearbeiten
                        </button>
                        <button
                          className="p-2 rounded-r-md text-white bg-teal-700 hover:bg-teal-600"
                          onClick={(e) => toggleDropdown(e, aCase.id)}
                          onDoubleClick={ignoreDefaults}
                        >
                          {
                            openDropdown === aCase.id
                              ? <ChevronUpIcon className="size-4" />
                              : <ChevronDownIcon className="size-4" />
                          }
                        </button>
                      </div>
                      <ul
                        className="absolute top-9 left-0 right-0 z-10 hidden data-open:block"
                        data-open={openDropdown === aCase.id}
                      >
                        <li className={menuItemsClasses}>
                          <button
                            className={clsx(menuItemButtonClasses, 'rounded-t-md')}
                            onClick={(e) => openUpload(e, aCase)}
                            onDoubleClick={ignoreDefaults}
                          >
                            <PaperClipIcon className="size-4 me-2 inline" />
                            Hochladen
                          </button>
                        </li>
                        <li className={menuItemsClasses}>
                          <button
                            className={clsx(menuItemButtonClasses)}
                            onClick={(e) => settleCase(e, aCase)}
                            onDoubleClick={ignoreDefaults}
                          >
                            <SettledIcon className="size-4 me-2 inline" />
                            Erledigen
                          </button>
                        </li>
                        <li className={menuItemsClasses}>
                          <button
                            className={clsx(menuItemButtonClasses, 'rounded-b-md text-rose-700')}
                            onClick={(e) => openDelete(e, aCase)}
                            onDoubleClick={ignoreDefaults}
                          >
                            <TrashIcon className="size-4 me-2 inline" />
                            Löschen
                          </button>
                        </li>
                      </ul>
                    </div>
                    {aCase.area && (
                      <div title="Rechtsgebiet" className="col-start-3 px-2 lg:hidden md:mr-4">
                        {aCase.area}
                      </div>
                    )}
                    {aCase.todoDate && (
                      <div title="Vorfrist" className="hidden md:max-lg:block col-start-4 pr-2 text-right">
                        {formattedDate(aCase.todoDate)}
                      </div>
                    )}
                    <div className="col-start-3 col-end-5 px-2">
                      <b>Status:</b>
                      {' ' + statusLabels[aCase.status]}
                      {aCase.statusNote && (
                        <span title="Status-Notiz">
                          {' – '}
                          <AutoLink
                            text={aCase.statusNote}
                            linkClassName="text-teal-700 hover:text-teal-800 hover:underline"
                          />
                        </span>
                      )}
                    </div>
                    {aCase.memo && (
                      <div title="Anmerkung" className="col-start-3 col-end-5 px-2 italic whitespace-pre-wrap">
                        <AutoLink
                          text={aCase.memo}
                          linkClassName="text-teal-700 hover:text-teal-800 hover:underline"
                        />
                      </div>
                    )}
                    {documents.length > 0 && (
                      <div className="col-start-3 col-end-5 px-2 text-sm">
                        <ol>
                          {
                            documents.map((doc) => (
                              <li key={doc.id} className="flex items-center">
                                <PaperClipIcon className="size-3.5 inline me-1 shrink-0 self-start mt-1" />
                                <a
                                  href="#"
                                  className="text-teal-700 hover:text-teal-800 hover:underline"
                                  onClick={(e) => downloadDocument(e, aCase.id, doc.id, doc.filename)}
                                  onDoubleClick={ignoreDefaults}
                                >
                                  {doc.filename}
                                </a>
                                <XMarkIcon
                                  className={clsx('size-3 inline ms-2 shrink-0 self-start mt-1 hover:text-teal-700 hover:cursor-pointer',
                                    selectedDocumentId === doc.id && 'hidden')}
                                  title="Löschen"
                                  onClick={(e) => selectDocument(e, doc.id)}
                                  onDoubleClick={ignoreDefaults}
                                />
                                <div className={clsx('self-start inline-flex items-center ms-2', selectedDocumentId !== doc.id && 'hidden')}>
                                  <ChevronLeftIcon
                                    className="size-3 cursor-pointer inline"
                                    onClick={(e) => selectDocument(e, null)}
                                    onDoubleClick={ignoreDefaults}
                                  />
                                  <span className="ms-1 font-semibold">Löschen?</span>
                                  <TrashIcon
                                    className="inline size-3 ms-1 cursor-pointer"
                                    onClick={(e) => deleteDocument(e, aCase.id, doc.id)}
                                    onDoubleClick={ignoreDefaults}
                                  />
                                </div>
                              </li>
                            ))
                          }
                        </ol>
                      </div>
                    )}
                    <FailureAlert message={errorMessage} className="col-start-3 md:col-end-5 lg:col-end-7" />
                    <div
                      className="col-start-3 md:col-end-5 lg:col-end-7 text-xs flex flex-col sm:flex-row justify-between px-2 gap-2"
                    >
                      <div>
                        {`Eingegangen am ${formattedDate(aCase.receivedOn)}`}
                      </div>
                      <div>
                        {`Geändert ${formattedDateTime(aCase.updatedAt)}`}
                      </div>
                    </div>
                  </div>
                </Transition>
              </>
            )}
          </li>
        );
      },
      )}
    </ol>
  );
}
