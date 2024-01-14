import {Listbox, Transition} from "@headlessui/react";
import {
    ArrowDownOnSquareIcon,
    ArrowPathIcon,
    PencilIcon,
    PlusCircleIcon,
    TrashIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import {ChevronDownIcon, ChevronUpIcon} from "@heroicons/react/24/solid";
import {useDebounce} from "@uidotdev/usehooks";
import {useContext, useEffect, useRef, useState} from "react";
import {ApiContext} from "./ApiProvider";
import DeleteModal from "./DeleteModal";
import EditModal from "./EditModal";
import FailureAlert from "./FailureAlert";
import FileUploadModal from "./FileUploadModal";
import {StatusIcon, statusKeys, statusLabels} from "./Status";
import {startOfWeek} from "./utils";

const typeMap = {
    CHAMBER: 'K',
    SINGLE: 'ER'
};
const typeKeys = Object.keys(typeMap);

const typeLabels = {
    CHAMBER: 'Kammersache',
    SINGLE: 'Einzelrichter'
}

const filterStatusKeys = statusKeys.filter(value => value !== 'SETTLED');

export default function Content() {

    const api = useContext(ApiContext);

    const [cases, setCases] = useState(null);
    const [filteredCases, setFilteredCases] = useState(null);
    const [search, setSearch] = useState('');
    const [statusQuery, setStatusQuery] = useState([]);
    const [typeQuery, setTypeQuery] = useState(null);
    const [isEditOpen, setEditOpen] = useState(false);
    const [isUploadOpen, setUploadOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [caseResource, setCaseResource] = useState(emptyCase());
    const [todosOnly, setTodosOnly] = useState(false);
    const [settledOnly, setSettledOnly] = useState(false);
    const [reloadCases, setReloadCases] = useState(true);
    const [recentlyUpdatedId, setRecentlyUpdatedId] = useState();
    const [loading, setLoading] = useState(false);
    const delayedLoading = useDebounce(loading, 1000);
    const [forceSpinner, setForceSpinner] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const searchRef = useRef(null);

    const loadingSpinner = (loading && delayedLoading) || forceSpinner;

    useEffect(() => {
        setLoading(true);
        api.getCases(statusQuery, typeQuery, settledOnly)
            .then(response => {
                setCases(response.data && response.data.cases.map(c => {
                    c.reference = `${c.ref.entity} ${c.ref.register} ${c.ref.number}/${c.ref.year.toString().padStart(2, '0')}`;
                    if (c.id === recentlyUpdatedId) {
                        c.recentlyUpdated = true;
                    }
                    return c;
                }));
                setLoading(false);
                setForceSpinner(false);
                setErrorMessage('');
                // remove the animation css class after about 2.5s (duration of delay + animation, see tailwind.config.js)
                setTimeout(() => setRecentlyUpdatedId(undefined), 2600);
            })
            .catch(error => setErrorMessage(error.userMessage));
    }, [reloadCases, statusQuery, typeQuery, settledOnly]);

    useEffect(() => {
        if (!cases) {
            return;
        }
        if (todosOnly && !settledOnly) {
            let newCases = cases.filter(c => c.todoDate)
                .filter(c => containsSearch(c, search))
                .sort((c1, c2) => c1.todoDate.localeCompare(c2.todoDate))
                .map(c => Object.assign({}, c));
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
                                startOfWeek: startOfWeek(recentTodo, j)
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
                        newWeek: true
                    },
                    ...newCases.slice(e.casesIndex)];
            }
            setFilteredCases(newCases);
        } else {
            setFilteredCases(cases.filter(c => containsSearch(c, search)));
        }
    }, [cases, todosOnly, settledOnly, search]);

    // pull to refresh on mobile devices (tested on iOS only)
    useEffect(() => {
        const onTouchEnd = () => {
            if (window.scrollY <= -100) { // screen has been "overscrolled", is this a standard behavior?
                setForceSpinner(true);
                setTimeout(forceUpdate, 500);
            }
        }

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
        const props = ['parties', 'area', 'caseMemo', 'statusNote', 'reference'];
        for (const prop of props) {
            if (aCase[prop] && aCase[prop].toLowerCase().indexOf(search) !== -1) {
                return true;
            }
        }
        return false;
    }

    function emptyCase() {
        return {ref: {}};
    }

    function forceUpdate(updated) {
        setReloadCases(b => !b);
        setRecentlyUpdatedId(updated && updated.id);
    }

    function logout() {
        api.logout();
    }

    function toggleStatus(status) {
        const statusSet = new Set(statusQuery);
        if (statusSet.has(status)) {
            statusSet.delete(status);
        } else {
            statusSet.add(status);
        }
        setStatusQuery([...statusSet])
    }

    function toggleType(type) {
        setTypeQuery(t => t === type ? null : type);
    }

    function openEditModal(event, id) {
        event.stopPropagation();
        if (id) {
            api.getCase(id)
                .then(response => {
                    setCaseResource(response.data);
                    setEditOpen(true);
                    setErrorMessage('');
                })
                .catch(error => setErrorMessage(error.userMessage));
        } else {
            setCaseResource(emptyCase());
            setEditOpen(true);
        }
    }

    function openDeleteModal(aCase) {
        setCaseResource(aCase);
        setDeleteOpen(true);
    }

    return (
        <>
            {/* modals */}
            <EditModal isOpen={isEditOpen} setIsOpen={setEditOpen} caseResource={caseResource}
                       forceUpdate={forceUpdate}/>

            <FileUploadModal isOpen={isUploadOpen} setIsOpen={setUploadOpen} forceUpdate={forceUpdate}/>

            <DeleteModal isOpen={isDeleteOpen} setIsOpen={setDeleteOpen} caseResource={caseResource}
                         forceUpdate={forceUpdate}/>

            {/* header */}
            <div
                className="mb-8 flex flex-row justify-between items-baseline border-b-2 border-b-stone-400 border-solid">
                <div className="font-semibold mb-2 flex flex-row justify-start items-baseline">
                    <img src="/logo.svg" alt="Logo" className="mr-2 my-auto size-5"/>
                    <span>Causalist</span>
                </div>
                {process.env.NODE_ENV === "development" &&
                    /* responsiveness helper (development only) */
                    <div className="text-white bg-rose-700 font-bold text-sm px-4 py-1 rounded-full">
                        <span className="sm:hidden">xs</span>
                        <span className="hidden sm:inline md:hidden">sm</span>
                        <span className="hidden md:inline lg:hidden">md</span>
                        <span className="hidden lg:inline xl:hidden">lg</span>
                        <span className="hidden xl:inline 2xl:hidden">xl</span>
                        <span className="hidden 2xl:inline 3xl:hidden">2xl</span>
                    </div>
                }
                <div className="mb-2">
                    <button className="text-teal-700 hover:underline"
                            onClick={logout}>
                        Abmelden
                    </button>
                </div>
            </div>

            {/* filter */}
            <div className="mb-8 flex flex-row justify-between">
                <div className="flex flex-row flex-wrap gap-5 justify-between md:justify-start w-full ">
                    {/* type buttons */}
                    <div className="inline-flex rounded-lg shadow-sm" role="group">
                        {
                            typeKeys.map(type => (
                                <button type="button" key={type} data-selected={typeQuery === type}
                                        title={typeLabels[type]}
                                        className="px-2 py-2 w-11 text-sm font-semibold text-stone-900
                                                   border border-r-0 border-stone-300 first:rounded-l-lg last:rounded-r-lg last:border-r
                                                   hover:text-white hover:bg-teal-700
                                                   focus-visible:text-white focus-visible:bg-teal-700 focus-visible:outline-none
                                                   data-selected:text-teal-700 data-selected:bg-stone-200
                                                   data-selected:shadow-inner data-selected:shadow-stone-400/50
                                                   data-selected:hover:text-teal-100 data-selected:hover:bg-teal-700"
                                        onClick={() => toggleType(type)}>
                                    {typeMap[type]}
                                </button>
                            ))
                        }
                    </div>

                    {/* status buttons */}
                    <div className="inline-flex rounded-lg shadow-sm order-first sm:order-none w-full sm:w-auto"
                         role="group">
                        {
                            filterStatusKeys.map(status => (
                                <button type="button" key={status} disabled={settledOnly}
                                        data-selected={statusQuery.indexOf(status) !== -1}
                                        title={statusLabels[status]}
                                        className="px-2 py-2 w-full text-stone-900
                                                   border border-r-0 border-stone-300 first:rounded-l-lg last:rounded-r-lg last:border-r
                                                   hover:text-white hover:bg-teal-700
                                                   focus-visible:text-white focus-visible:bg-teal-700 focus-visible:outline-none
                                                   data-selected:text-teal-700 data-selected:bg-stone-200
                                                   data-selected:shadow-inner data-selected:shadow-stone-400/50
                                                   data-selected:hover:text-teal-100 data-selected:hover:bg-teal-700
                                                   disabled:!text-stone-900 disabled:!bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={() => toggleStatus(status)}>
                                    <StatusIcon status={status} className="w-5 sm:w-6 h-6 mx-auto"/>
                                </button>
                            ))
                        }
                    </div>

                    {/* search input */}
                    <div className="inline-flex flex-1 sm:order-last md:order-none relative
                                    h-[42px]"> {/* same height as status filter button row */}
                        <input type="text" placeholder="Suche" value={search} ref={searchRef}
                               className="block w-full pr-8 bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg focus:ring-teal-700 focus:border-teal-700"
                               onChange={e => setSearch(e.target.value)}/>
                        <div
                            className={`absolute bottom-0 top-0 right-0 pr-2.5 py-3 cursor-pointer ${search ? 'text-stone-900' : 'text-stone-400'}`}
                            onClick={() => {
                                setSearch('');
                                searchRef.current.focus();
                            }}>
                            <XMarkIcon className="size-5"/>
                        </div>
                    </div>

                    <div className="hidden xl:block flex-1">{/*spacer*/}</div>

                    <div className="inline-flex rounded-lg shadow-sm">
                        {/* new case button */}
                        <div className="inline-flex">
                            <button
                                className="flex w-full justify-center rounded-lg md:rounded-r-none px-3 py-2 text-sm font-semibold leading-6 bg-teal-700 text-white border-r border-white hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                                onClick={openEditModal}>
                                <PlusCircleIcon className="size-6 relative top-0.5"/>
                                <span className="pl-2 lg:inline hidden">Neu</span>
                            </button>
                        </div>
                        {/* rtf upload */}
                        <div className="hidden md:inline-flex">
                            <button
                                className="flex w-full justify-center rounded-r-lg bg-teal-700 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                                onClick={() => setUploadOpen(true)}>
                                <ArrowDownOnSquareIcon className="size-6"/>
                                <span className="pl-2 lg:inline hidden">RTF Import</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* alert */}
            <FailureAlert message={errorMessage} className="mb-8"/>

            {/* cases select and date checkbox */}
            <div className="flex flex-row justify-between align-baseline">
                <Listbox value={settledOnly} onChange={setSettledOnly}>
                    <div className="relative">
                        <Listbox.Button
                            className="text-lg font-semibold mb-2 focus-visible:outline-none focus-visible:underline hover:underline decoration-teal-700">
                            {settledOnly ? "Erledigte Verfahren" : `${filteredCases ? filteredCases.length : ''} Laufende Verfahren`}
                            <ChevronDownIcon className="inline ui-open:hidden size-5 ml-1"/>
                            <ChevronUpIcon className="hidden ui-open:inline size-5 ml-1"/>
                        </Listbox.Button>
                        <Listbox.Options
                            className="absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            <Listbox.Option value={false} className={({active}) =>
                                `relative cursor-default select-none py-2 px-4 ${active ? 'bg-stone-100 text-teal-700' : 'text-stone-900'}`
                            }>Laufende Verfahren</Listbox.Option>
                            <Listbox.Option value={true} className={({active}) =>
                                `relative cursor-default select-none py-2 px-4 ${active ? 'bg-stone-100 text-teal-700' : 'text-stone-900'}`
                            }>Erledigte Verfahren</Listbox.Option>
                        </Listbox.Options>
                    </div>
                </Listbox>

                <label className={`${settledOnly ? 'hidden' : 'inline'}`}>
                    <input type="checkbox"
                           className="size-4 mr-2 text-teal-700 bg-stone-50 border-stone-300 focus:ring-teal-700 focus:ring-2 "
                           checked={todosOnly}
                           onChange={() => setTodosOnly(!todosOnly)}/>
                    Fristen
                </label>
            </div>

            {/* loading spinner */}
            {loadingSpinner &&
                <div className="relative">
                    <ArrowPathIcon className="absolute top-1 w-full mx-auto size-8 animate-spin"/>
                </div>
            }

            {/* cases table */}
            <CasesList cases={filteredCases} loadingSpinner={loadingSpinner} recentlyUpdatedId={recentlyUpdatedId}
                       openEditModal={openEditModal} openDeleteModal={openDeleteModal}/>
        </>
    )
}

function CasesList({cases, loadingSpinner, recentlyUpdatedId, openEditModal, openDeleteModal}) {

    const [openCase, setOpenCase] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [clickedCase, setClickedCase] = useState(null);
    const singleClickedCase = useDebounce(clickedCase, 300);

    useEffect(() => {
        if (recentlyUpdatedId) {
            setOpenCase(null);
        }
    }, [recentlyUpdatedId]);

    useEffect(() => {
        if (singleClickedCase && clickedCase && singleClickedCase === clickedCase) {
            setOpenCase(o => o === clickedCase ? null : clickedCase);
            setOpenDropdown(null);
            setClickedCase(null);
        }
    }, [singleClickedCase]);

    function clickCase(id) {
        // double-click toggles clickedCase
        setClickedCase(c => c === id ? null : id);
    }

    function toggleDropdown(event, id) {
        event.stopPropagation();
        setOpenDropdown(o => o === id ? null : id);
    }

    function openDelete(event, aCase) {
        event.stopPropagation();
        setOpenDropdown(null);
        openDeleteModal(aCase);
    }

    function formattedDate(date) {
        return date && new Date(date).toLocaleDateString();
    }

    function formattedDateTime(date) {
        let d = date && new Date(date);
        return d && (d.toLocaleDateString() + ' ' + d.toLocaleTimeString());
    }

    function todoBg(date) {
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

    return (
        <ol className={`grid grid-cols-cases md:grid-cols-cases-md lg:grid-cols-cases-lg
                        ${loadingSpinner ? 'opacity-25' : ''}`}>
            {cases.length === 0 &&
                <li className="col-span-full text-stone-600 py-2 border-y border-y-stone-50">
                    Du hast keine Verfahren für die aktuellen Filter- und Suchkriterien.
                </li>
            }
            {cases.map(aCase =>
                <li key={aCase.id}
                    data-open={openCase === aCase.id}
                    className={`col-span-full grid grid-cols-subgrid
                                border-y border-y-stone-50 data-open:border-y-stone-700 
                                ${aCase.ref ? 'hover:border-y-stone-300 cursor-pointer py-2' : ''} 
                                data-open:hover:border-y-teal-700 
                                hover:text-teal-700 ${todoBg(aCase.todoDate)}
                                ${recentlyUpdatedId && aCase.recentlyUpdated ? 'animate-updated' : ''}
                                ${aCase.newWeek ? 'relative mt-20 first:mt-8 border-t-teal-700' : ''}`}
                    onClick={() => clickCase(aCase.ref && aCase.id)}
                    onDoubleClick={e => openEditModal(e, aCase.ref && aCase.id)}>
                    {aCase.newWeek &&
                        <div className="absolute -top-6 right-0 py-1 px-7
                                        text-xs bg-teal-700 text-white rounded-t-lg">
                            KW {aCase.todoWeekOfYear} vom {formattedDate(startOfWeek(aCase.todoDate))}
                        </div>
                    }
                    {aCase.ref && // a case without ref is placeholder for an empty week
                        <>
                            <div className="flex justify-end w-full items-baseline">
                                <span className="grow flex-none text-right">{aCase.reference}</span>
                                <span className="basis-4 flex-none text-left font-bold text-teal-600 text-xs ml-1 ">
                                    {typeMap[aCase.type]}
                                </span>
                            </div>
                            <div title={statusLabels[aCase.status]}>
                                <StatusIcon status={aCase.status} className="size-6 mx-auto"/>
                            </div>
                            <div data-open={openCase === aCase.id}
                                 className="px-2 whitespace-nowrap overflow-hidden text-ellipsis
                                            data-open:whitespace-normal data-open:md:mr-4">
                                <span title={aCase.parties ? "Parteien" : null}>{aCase.parties}</span>
                                <div className="md:hidden text-sm">
                                    <span title={aCase.todoDate && "Vorfrist"}
                                          className={`${aCase.todoDate ? 'pr-4' : 'hidden'}`}>
                                        {formattedDate(aCase.todoDate)}
                                    </span>
                                    <span title={isSettled(aCase) ? (aCase.settledOn && "Erledigt am")
                                                                  : (aCase.dueDate && "nächster Termin")}
                                          className="font-semibold empty:hidden">
                                        {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                                    </span>
                                </div>
                            </div>
                            <div title={aCase.area ? "Rechtsgebiet" : null}
                                 data-open={openCase === aCase.id}
                                 className="hidden lg:inline px-2 whitespace-nowrap overflow-hidden text-ellipsis data-open:whitespace-normal data-open:mr-4">
                                {aCase.area}
                            </div>
                            <div title={aCase.todoDate && "Vorfrist"}
                                 className="hidden lg:inline text-right pr-2">
                                {formattedDate(aCase.todoDate)}
                            </div>
                            <div
                                title={isSettled(aCase) ? (aCase.settledOn && "Erledigt am") : (aCase.dueDate && "nächster Termin")}
                                className="hidden md:inline empty:hidden font-semibold text-right pr-2">
                                {formattedDate(isSettled(aCase) ? aCase.settledOn : aCase.dueDate)}
                            </div>
                            <Transition
                                show={openCase === aCase.id}
                                appear={true}
                                className="col-span-full grid grid-cols-subgrid gap-y-4 pt-4"
                                enter="transition-opacity duration-100 ease-out"
                                enterFrom="opacity-20"
                                enterTo="opacity-100"
                                leave="transition-opacity duration-75 ease-out"
                                leaveFrom="opacity-100 grid"
                                leaveTo="opacity-0 hidden">
                                <div className="col-start-1 col-end-3 row-start-1 row-end-3 mx-2.5 relative">
                                    <div className="flex">
                                        <button
                                            className="flex w-full self-start px-3 py-2 rounded-l-lg
                                                       leading-4 text-sm font-semibold text-white shadow-sm
                                                       bg-teal-700 hover:bg-teal-600 border-r-white border-r
                                                       focus-visible:outline focus-visible:outline-2
                                                       focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                                            onClick={e => openEditModal(e, aCase.id)}>
                                            <PencilIcon className="size-4 mr-2"/>
                                            Bearbeiten
                                        </button>
                                        <button
                                            className="self-start p-2 rounded-r-lg text-white bg-teal-700 hover:bg-teal-600"
                                            onClick={e => toggleDropdown(e, aCase.id)}
                                            onDoubleClick={e => e.stopPropagation()}>
                                            {
                                                openDropdown === aCase.id ? <ChevronUpIcon className="size-4"/>
                                                    : <ChevronDownIcon className="size-4"/>
                                            }
                                        </button>
                                    </div>
                                    <ul className="absolute top-9 left-0 right-0 z-10 hidden data-open:block"
                                        data-open={openDropdown === aCase.id}>
                                        <li>
                                            <button className="flex w-full px-3 py-2 rounded-lg
                                                               leading-4 text-sm font-semibold text-rose-700 shadow-sm
                                                               border border-stone-300 bg-white hover:bg-stone-100"
                                                    onClick={e => openDelete(e, aCase)}
                                                    onDoubleClick={e => e.stopPropagation()}>
                                                <TrashIcon className="size-4 mr-2"/>
                                                Löschen
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                                {aCase.area &&
                                    <div title="Rechtsgebiet"
                                         className="col-start-3 px-2 lg:hidden md:mr-4">
                                        {aCase.area}
                                    </div>
                                }
                                {aCase.todoDate &&
                                    <div title="Vorfrist"
                                         className="hidden md:max-lg:block col-start-4 pr-2 text-right">
                                    {formattedDate(aCase.todoDate)}
                                    </div>
                                }
                                <div className="col-start-3 col-end-5 px-2">
                                    <b>Status:</b> {statusLabels[aCase.status]}
                                    {aCase.statusNote && <span title="Status-Notiz"> - {aCase.statusNote}</span>}
                                </div>
                                {aCase.memo &&
                                    <div title="Anmerkung" className="col-start-3 col-end-5 px-2 italic">
                                        {aCase.memo}
                                    </div>
                                }
                                <div className="col-start-3 md:col-end-5 lg:col-end-7 text-xs
                                                flex flex-col sm:flex-row justify-between px-2 gap-2">
                                    <div>Eingegangen am {formattedDate(aCase.receivedOn)}</div>
                                    <div>Geändert {formattedDateTime(aCase.updatedAt)}</div>
                                </div>
                            </Transition>
                        </>
                    }
                </li>
            )}
        </ol>
    );
}
