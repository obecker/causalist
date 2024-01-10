import {ExclamationCircleIcon} from "@heroicons/react/20/solid";

export default function FailureAlert({message, className = ''}) {
    return message &&
        <div role="alert"
             className={`${message ? 'flex' : 'hidden'} ${className} 
                        items-center p-4 text-sm text-rose-800 bg-rose-50 rounded-lg`}>
            <ExclamationCircleIcon className="size-5 me-3 flex-shrink-0 inline"/>
            <span className="font-medium">{message}</span>
        </div>;
}
