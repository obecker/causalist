import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx/lite';

export default function FailureAlert({ message, className = '' }) {
  const alertClasses = clsx(
    message ? 'flex' : 'hidden',
    className,
    'items-center bg-rose-50 p-4 text-sm text-rose-800 rounded-lg',
  );

  return (message && (
    <div role="alert" className={alertClasses}>
      <ExclamationCircleIcon className="me-3 inline size-5 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  ));
}
