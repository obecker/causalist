import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { ChevronLeftIcon, PaperClipIcon } from '@heroicons/react/20/solid';
import {
  ArrowDownOnSquareIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useDebounce } from '@uidotdev/usehooks';
import clsx from 'clsx/lite';
import { useContext, useEffect, useRef, useState } from 'react';

import { ApiContext } from './ApiContext';
import AutoLink from './AutoLink';
import DeleteModal from './DeleteModal';
import EditModal from './EditModal';
import FailureAlert from './FailureAlert';
import FileUploadModal from './FileUploadModal';
import { FortuneModal } from './FortuneModal';
import { SettledIcon } from './Icons';
import RtfImportModal from './RtfImportModal';
import { statusKeys, statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { typeKeys, typeLabels, typeMap } from './type';
import {
  formattedDate,
  formattedDateTime,
  formattedTime,
  formattedYearMonth,
  single,
  startOfWeek,
  today,
} from './utils';

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
  const [isFortuneOpen, setFortuneOpen] = useState(false);
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

    function safeLocaleCompare(a, b) {
      return (a || '').localeCompare((b || ''));
    }

    function compareByDates(c1, c2) {
      return (
        c1.todoDate.localeCompare(c2.todoDate)
        || safeLocaleCompare(c1.dueDate, c2.dueDate)
        || safeLocaleCompare(c1.dueTime, c2.dueTime)
        || c1.status.localeCompare(c2.status)
        || c1.id.localeCompare(c2.id)
      );
    }

    let newCases;
    if (todosOnly && !settledOnly) {
      newCases = cases.filter((c) => c.todoDate)
        .filter((c) => containsSearch(c, search))
        .sort((c1, c2) => compareByDates(c1, c2))
        .map((c) => Object.assign({}, c));
      let recentWeek = null;
      let recentTodo = null;
      let emptyWeeks = [];
      const label = (weekOfYear, date) => `KW ${weekOfYear} vom ${formattedDate(date)}`;
      for (let i = 0; i < newCases.length; i++) {
        let c = newCases[i];
        if (c.todoWeekOfYear && c.todoWeekOfYear !== recentWeek) {
          c.separatorLabel = label(c.todoWeekOfYear, startOfWeek(c.todoDate));
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
      // add placeholder entries for empty weeks into the case list
      for (let i = emptyWeeks.length - 1; i >= 0; i--) {
        const e = emptyWeeks[i];
        newCases = [
          ...newCases.slice(0, e.casesIndex),
          {
            id: `week-${e.startOfWeek}`, // required field (used as react key)
            separatorLabel: label(e.weekOfYear, e.startOfWeek),
          },
          ...newCases.slice(e.casesIndex),
        ];
      }
    } else if (settledOnly) {
      newCases = cases.map((c) => Object.assign({}, c));
      let recentMonth = null;
      let emptyMonths = [];
      for (let i = 0; i < newCases.length; i++) {
        let c = newCases[i];
        const settledOn = new Date(c.settledOn);
        const currentMonth = settledOn.getFullYear() * 12 + settledOn.getMonth();
        const dateFromCurrentMonth = (month) => `${Math.floor(month / 12)}-${(month % 12).toString().padStart(2, '0')}-01`;
        if (currentMonth !== recentMonth) {
          c.separatorLabel = formattedYearMonth(settledOn);
          if (recentMonth) {
            // determine missing (empty) months
            for (let j = recentMonth - currentMonth; j > 1; j--) {
              emptyMonths.push({
                casesIndex: i,
                settledOn: dateFromCurrentMonth(currentMonth + j),
                settledMonth: currentMonth + j,
              });
            }
          }
          recentMonth = currentMonth;
        }
      }
      // add placeholder entries for empty months into the case list
      for (let i = emptyMonths.length - 1; i >= 0; i--) {
        const e = emptyMonths[i];
        newCases = [
          ...newCases.slice(0, e.casesIndex),
          {
            id: `month-${e.settledMonth}`, // required field (used as react key)
            settledOn: e.settledOn,
            separatorLabel: formattedYearMonth(new Date(e.settledOn)),
          },
          ...newCases.slice(e.casesIndex),
        ];
      }
      // count the number of cases per month
      let settledPerMonth = 0;
      for (let i = newCases.length - 1; i >= 0; i--) {
        let c = newCases[i];
        if (c.separatorLabel) {
          c.ref && settledPerMonth++;
          c.separatorLabel = `${c.separatorLabel}: ${settledPerMonth} Erledigung${settledPerMonth !== 1 ? 'en' : ''}`;
          settledPerMonth = 0;
        } else {
          settledPerMonth++;
        }
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

  const numberOfCases = filteredCases?.filter((c) => c.ref)?.length; // filter out placeholders
  const casesHeader = `${numberOfCases ?? ''} ${settledOnly ? 'Erledigte' : 'Laufende'}${numberOfCases === 1 ? 's' : ''} Verfahren`;

  return (
    <>
      {/* modals */}
      <EditModal isOpen={isEditOpen} setIsOpen={setEditOpen} selectedCase={selectedCase} forceUpdate={forceUpdate} />

      <RtfImportModal isOpen={isImportOpen} setIsOpen={setImportOpen} forceUpdate={forceUpdate} />
      <FileUploadModal
        isOpen={isUploadOpen}
        setIsOpen={setUploadOpen}
        selectedCase={selectedCase}
        forceUpdate={() => setReloadDocuments((b) => !b)}
      />

      <DeleteModal
        isOpen={isDeleteOpen}
        setIsOpen={setDeleteOpen}
        selectedCase={selectedCase}
        forceUpdate={forceUpdate}
      />

      <FortuneModal
        isOpen={isFortuneOpen}
        setIsOpen={setFortuneOpen}
        cases={cases}
        setSelectedCase={setSelectedCase}
        setEditOpen={setEditOpen}
      />

      {/* header */}
      <div className="mb-8 flex flex-row items-baseline justify-between border-b-2 border-solid border-b-stone-400">
        <div className="mb-2 flex flex-row items-baseline justify-start">
          <img src="/logo.svg" alt="Logo" className="my-auto mr-2 size-5" onClick={() => setFortuneOpen(true)} />
          <span className="font-kaushanScript text-lg">Causalist</span>
        </div>
        { // responsiveness helper (development only)
          process.env.NODE_ENV === 'development' && (
            <div className="rounded-full bg-rose-700 px-4 py-1 text-sm font-bold text-white">
              <span className="sm:hidden">xs</span>
              <span className="hidden sm:inline md:hidden">sm</span>
              <span className="hidden md:inline lg:hidden">md</span>
              <span className="hidden lg:inline xl:hidden">lg</span>
              <span className="hidden xl:inline 2xl:hidden">xl</span>
              <span className="hidden 2xl:inline">2xl</span>
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
        <div className="flex w-full flex-row flex-wrap justify-between gap-5 md:justify-start">
          <TypeFilter typeQuery={typeQuery} setTypeQuery={setTypeQuery} />

          <StatusFilter statusQuery={statusQuery} setStatusQuery={setStatusQuery} settledOnly={settledOnly} />

          {/* search input */}
          {/* h-[42px] -> same height as status filter button row */}
          <div className="relative inline-flex h-[42px] flex-1 sm:order-last md:order-none">
            <input
              type="text"
              placeholder="Suche"
              value={search}
              ref={searchRef}
              className="block w-full min-w-20 rounded-md border border-stone-300 bg-stone-50 pr-8 text-sm text-stone-900 focus:border-teal-700 focus:ring-teal-700"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
            />
            <div
              className="absolute top-0 right-0 bottom-0 py-3 pr-2.5 text-stone-600 hover:text-stone-900"
              title="Leeren"
              onClick={() => {
                setSearch('');
                searchRef.current.focus();
              }}
            >
              <XMarkIcon className="size-5" />
            </div>
          </div>

          <div className="hidden flex-1 xl:block">{/* spacer */}</div>

          <div className="inline-flex rounded-md shadow-xs">
            {/* new case button */}
            <div className="inline-flex">
              <button
                className="flex w-full items-center rounded-md border-r border-white bg-teal-700 px-3 py-2 text-sm leading-6 font-semibold text-white hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:rounded-r-none"
                onClick={openEditModal}
              >
                <PlusCircleIcon className="inline size-6" />
                <span className="ms-2 hidden lg:inline">Neu</span>
              </button>
            </div>
            {/* rtf upload */}
            <div className="hidden sm:inline-flex">
              <button
                className="flex w-full items-center rounded-r-md bg-teal-700 px-3 py-2 text-sm leading-6 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:bg-stone-300"
                onClick={() => setImportOpen(true)}
              >
                <ArrowDownOnSquareIcon className="inline size-6" />
                <span className="ms-2 hidden lg:inline">RTF Import</span>
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
              className="mb-2 text-lg font-semibold decoration-teal-700 hover:underline focus-visible:underline focus-visible:outline-hidden"
            >
              {({ open }) => (
                <>
                  {casesHeader}
                  <ChevronDownIcon className={clsx('ml-1 size-5', open ? 'hidden' : 'inline')} />
                  <ChevronUpIcon className={clsx('ml-1 size-5', open ? 'inline' : 'hidden')} />
                </>
              )}
            </ListboxButton>
            <ListboxOptions
              className="absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base ring-1 shadow-lg ring-black/5 focus:outline-hidden sm:text-sm"
            >
              <ListboxOption
                value={false}
                className={({ focus }) =>
                  clsx(
                    'relative cursor-default px-4 py-2 select-none',
                    focus ? 'bg-stone-100 text-teal-700' : 'text-stone-900',
                  )}
              >
                Laufende Verfahren
              </ListboxOption>
              <ListboxOption
                value={true}
                className={({ focus }) =>
                  clsx(
                    'relative cursor-default px-4 py-2 select-none',
                    focus ? 'bg-stone-100 text-teal-700' : 'text-stone-900',
                  )}
              >
                Erledigte Verfahren
              </ListboxOption>
            </ListboxOptions>
          </div>
        </Listbox>

        <label className={settledOnly ? 'hidden' : 'flex'}>
          <input
            type="checkbox"
            className="mr-2 size-4 self-center rounded-sm border-stone-300 bg-stone-50 text-teal-700 checked:border-teal-700 checked:bg-teal-700 focus:ring-2 focus:ring-teal-700"
            checked={todosOnly}
            onChange={() => setTodosOnly((t) => !t)}
          />
          <span className="self-center pr-2">Fristen</span>
        </label>
      </div>

      {/* loading spinner */}
      {loadingSpinner && (
        <div className="relative">
          <ArrowPathIcon className="absolute top-1 mx-auto size-8 w-full animate-spin" />
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
        todosOnly={todosOnly}
      />
    </>
  );
}

function TypeFilter({ typeQuery, setTypeQuery }) {
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
    <div className="inline-flex rounded-md shadow-xs" role="group">
      {
        typeKeys.map((type) => (
          <button
            type="button"
            key={type}
            data-selected={typeQuery.includes(type) || null}
            title={typeLabels[type]}
            className="w-11 border border-r-0 border-stone-300 p-2 text-sm font-semibold text-stone-900 first:rounded-l-md last:rounded-r-md last:border-r hover:text-teal-700 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 data-selected:bg-teal-700 data-selected:text-white data-selected:hover:bg-teal-600"
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
        filterStatusKeys.filter((s) => s !== status).forEach((s) => newStatusQuery.push(s));
      } else {
        newStatusQuery.push(status);
      }
      return newStatusQuery;
    });
  }

  return (
    <div className="order-first inline-flex w-full rounded-md shadow-xs sm:order-none sm:w-auto" role="group">
      {
        filterStatusKeys.map((status) => (
          <button
            type="button"
            key={status}
            disabled={settledOnly}
            data-selected={statusQuery.includes(status) || null}
            title={statusLabels[status]}
            className="w-full border border-r-0 border-stone-300 p-2 text-stone-900 first:rounded-l-md last:rounded-r-md last:border-r hover:text-teal-700 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-white! disabled:text-stone-400! data-selected:bg-teal-700 data-selected:text-white data-selected:hover:bg-teal-600"
            onClick={() => toggleStatus(status)}
            onDoubleClick={() => forceStatus(status)}
          >
            <StatusIcon status={status} className="mx-auto size-6" />
          </button>
        ))
      }
    </div>
  );
}

function CasesList({
  cases,
  loadingSpinner,
  recentlyUpdatedId,
  openEditModal,
  openUploadModal,
  openDeleteModal,
  reloadDocuments,
  setReloadDocuments,
  forceUpdate,
  todosOnly,
}) {
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
      setOpenCaseId((o) => (o === clickedCaseId ? null : clickedCaseId));
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
    setOpenDropdown((o) => (o === id ? null : id));
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

  function todoBg(aCase) {
    if (isSettled(aCase)) {
      return '';
    }

    const date = aCase.todoDate;
    const now = new Date();
    const due = (date && new Date(date)) || now;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!aCase.dueDate) {
      return '';
    } else if (date && (due < now)) {
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

  const menuItemsClasses = 'border border-b-0 border-stone-300 first:rounded-t-md last:rounded-b-md last:border-b';
  const menuItemButtonClasses = 'flex w-full items-center bg-white px-3 py-2 text-sm leading-5 font-semibold hover:bg-stone-100';
  return (
    <ol
      className={clsx(
        'grid grid-cols-(--grid-cases) md:grid-cols-(--grid-cases-md) lg:grid-cols-(--grid-cases-lg) xl:grid-cols-(--grid-cases-xl)',
        loadingSpinner && 'opacity-25',
      )}
    >
      {cases.length === 0 && (
        <li className="col-span-full border-y border-y-stone-50 py-2 text-stone-600">
          Du hast keine Verfahren für die aktuellen Filter- und Suchkriterien.
        </li>
      )}
      {cases.map((aCase) => (
        <li
          key={aCase.id}
          data-open={openCaseId === aCase.id || null}
          className={clsx(
            'col-span-full grid grid-cols-subgrid border-y border-y-stone-50 hover:text-teal-700 data-open:border-y-stone-700 data-open:hover:border-y-teal-700 data-open:hover:text-stone-900',
            aCase.ref && 'pt-2.5 pb-1.5 hover:border-y-stone-300',
            todoBg(aCase),
            recentlyUpdatedId && aCase.recentlyUpdated && 'animate-updated',
            aCase.separatorLabel && 'relative mt-20 border-t-teal-700 first:mt-8',
          )}
          onClick={(e) => clickCase(e, aCase.ref && aCase.id)}
          onDoubleClick={(e) => openEditModal(e, aCase.ref && aCase)}
          onMouseDown={(e) => e.detail === 2 && e.preventDefault()} // no text selection on double click
        >
          {aCase.separatorLabel && (
            <div className="absolute -top-6 right-0 rounded-t-lg bg-teal-700 px-7 py-1 text-xs text-white">
              {aCase.separatorLabel}
            </div>
          )}
          {aCase.ref && ( // a case without ref is a placeholder for an empty entry
            <>
              <div className="flex w-full items-baseline justify-end">
                <span className={clsx('marker ml-2 size-3 rounded-full', aCase.markerColor || 'none')}></span>
                <span className="flex-none grow text-right">{aCase.ref.value}</span>
                <span className="relative ml-1 flex-none basis-4 text-left text-xs font-bold text-teal-600">
                  {typeMap[aCase.type]}
                  {aCase.hasDocuments && <PaperClipIcon className="absolute -top-3 left-0 size-3.5 text-stone-400" />}
                </span>
              </div>
              <div title={statusLabels[aCase.status]}>
                <StatusIcon status={aCase.status} className="mx-auto size-6" />
              </div>
              <div
                data-open={openCaseId === aCase.id || null}
                className="overflow-hidden px-2 text-ellipsis whitespace-nowrap data-open:whitespace-normal md:data-open:mr-4"
              >
                <span title={openCaseId === aCase.id ? null : aCase.parties}>{aCase.parties}</span>
                <div className="text-sm md:hidden">
                  <span
                    title={isSettled(aCase)
                      ? (aCase.settledOn && 'Erledigt am')
                      : (aCase.dueDate && 'nächster Termin')}
                    className="font-semibold empty:hidden pe-4"
                  >
                    {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                    {formattedTime(!isSettled(aCase) && aCase.dueTime, ', ')}
                  </span>
                  <span className={!isSettled(aCase) && aCase.todoDate ? 'hidden sm:inline' : 'hidden'}>
                    {formattedDate(aCase.todoDate, 'Vorfrist: ')}
                  </span>
                </div>
                {((todosOnly && !isSettled(aCase)) || openCaseId === aCase.id) && (
                  <div className="text-sm sm:hidden">{formattedDate(aCase.todoDate, 'Vorfrist: ')}</div>
                )}
              </div>
              <div
                title={openCaseId === aCase.id ? null : aCase.area}
                data-open={openCaseId === aCase.id || null}
                className="hidden overflow-hidden px-2 text-ellipsis whitespace-nowrap data-open:mr-4 data-open:whitespace-normal lg:inline"
              >
                {aCase.area}
              </div>
              <div
                title={!isSettled(aCase) && aCase.todoDate ? 'Vorfrist' : null}
                className="hidden pr-2 text-right xl:inline"
              >
                {!isSettled(aCase) && formattedDate(aCase.todoDate)}
              </div>
              <div
                title={isSettled(aCase) ? aCase.settledOn && 'Erledigt am' : aCase.dueDate && 'nächster Termin'}
                className="hidden pr-2 text-right font-semibold empty:hidden md:inline"
              >
                {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                <span className="hidden md:inline">{formattedTime(!isSettled(aCase) && aCase.dueTime, ', ')}</span>
                {((todosOnly && !isSettled(aCase)) || openCaseId === aCase.id)
                  && <div className="font-normal text-sm xl:hidden">{formattedDate(aCase.todoDate, 'Vorfrist: ')}</div>}
              </div>
              <Transition show={openCaseId === aCase.id} appear>
                <div
                  className="col-span-full grid origin-top grid-cols-subgrid gap-y-3 pt-3 transition-all ease-out data-closed:opacity-0 data-enter:duration-150 data-leave:duration-100"
                >
                  <div className="relative col-start-1 col-end-3 row-start-1 row-end-3 mx-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        className="flex w-full items-center rounded-l-md border-r border-r-white bg-teal-700 px-3 py-2 text-sm leading-5 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                        onClick={(e) => openEditModal(e, aCase)}
                      >
                        <PencilIcon className="me-2 inline size-4" />
                        Bearbeiten
                      </button>
                      <button
                        className="rounded-r-md bg-teal-700 p-2.5 text-white hover:bg-teal-600"
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
                      className="absolute top-9 right-0 left-0 z-10 hidden data-open:block"
                      data-open={openDropdown === aCase.id || null}
                    >
                      <li className={menuItemsClasses}>
                        <button
                          className={clsx(menuItemButtonClasses, 'rounded-t-md')}
                          onClick={(e) => openUpload(e, aCase)}
                          onDoubleClick={ignoreDefaults}
                        >
                          <PaperClipIcon className="me-2 inline size-4" />
                          Hochladen
                        </button>
                      </li>
                      <li className={menuItemsClasses}>
                        <button
                          className={clsx(menuItemButtonClasses, 'disabled:text-stone-400')}
                          disabled={isSettled(aCase)}
                          onClick={(e) => settleCase(e, aCase)}
                          onDoubleClick={ignoreDefaults}
                        >
                          <SettledIcon className="me-2 inline size-4" />
                          Erledigen
                        </button>
                      </li>
                      <li className={menuItemsClasses}>
                        <button
                          className={clsx(menuItemButtonClasses, 'rounded-b-md text-rose-700')}
                          onClick={(e) => openDelete(e, aCase)}
                          onDoubleClick={ignoreDefaults}
                        >
                          <TrashIcon className="me-2 inline size-4" />
                          Löschen
                        </button>
                      </li>
                    </ul>
                  </div>
                  {aCase.area && (
                    <div className="col-start-3 px-2 md:mr-4 lg:hidden">
                      {aCase.area}
                    </div>
                  )}
                  {aCase.todoDate && (
                    <div title="Vorfrist" className="col-start-4 hidden pr-2 text-right md:max-lg:block">
                      {formattedDate(aCase.todoDate)}
                    </div>
                  )}
                  <div className="col-start-3 col-end-5 px-2">
                    <b>Status:</b>
                    {' ' + statusLabels[aCase.status]}
                    {aCase.statusNote && (
                      <span>
                        {' – '}
                        <AutoLink
                          text={aCase.statusNote}
                          linkClassName="text-teal-700 hover:text-teal-800 hover:underline"
                        />
                      </span>
                    )}
                  </div>
                  {aCase.memo && (
                    <div className="col-start-3 col-end-5 px-2 whitespace-pre-wrap italic">
                      <AutoLink text={aCase.memo} linkClassName="text-teal-700 hover:text-teal-800 hover:underline" />
                    </div>
                  )}
                  {documents.length > 0 && (
                    <div className="col-start-3 col-end-5 px-2 text-sm">
                      <ol>
                        {
                          documents.map((doc) => (
                            <li key={doc.id} className="flex items-center">
                              <PaperClipIcon className="me-1 mt-1 inline size-3.5 shrink-0 self-start" />
                              <a
                                href="#"
                                className="text-teal-700 hover:text-teal-800 hover:underline"
                                onClick={(e) => downloadDocument(e, aCase.id, doc.id, doc.filename)}
                                onDoubleClick={ignoreDefaults}
                              >
                                {doc.filename}
                              </a>
                              <XMarkIcon
                                className={clsx(
                                  'ms-2 mt-1 size-3 shrink-0 self-start hover:text-teal-700',
                                  selectedDocumentId === doc.id ? 'hidden' : 'inline',
                                )}
                                title="Löschen"
                                onClick={(e) => selectDocument(e, doc.id)}
                                onDoubleClick={ignoreDefaults}
                              />
                              <div
                                className={clsx(
                                  'ms-2 items-center self-start',
                                  selectedDocumentId !== doc.id ? 'hidden' : 'inline-flex',
                                )}
                              >
                                <ChevronLeftIcon
                                  className="inline size-3 hover:text-teal-700"
                                  onClick={(e) => selectDocument(e, null)}
                                  onDoubleClick={ignoreDefaults}
                                />
                                <span className="ms-1 font-semibold">Löschen?</span>
                                <TrashIcon
                                  className="ms-1 inline size-3 hover:text-rose-700"
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
                    className="col-start-3 flex flex-col justify-between gap-2 px-2 text-xs sm:flex-row md:col-end-5 lg:col-end-7"
                  >
                    <div>{`Eingegangen am ${formattedDate(aCase.receivedOn)}`}</div>
                    <div>{`Geändert ${formattedDateTime(aCase.updatedAt)}`}</div>
                  </div>
                </div>
              </Transition>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
