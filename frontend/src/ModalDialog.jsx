import { Dialog, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';

export default function ModalDialog({ isOpen, onClose, children }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <TransitionChild>
          <div className="fixed inset-0 bg-black/25 transition ease-out duration-300 data-closed:opacity-0" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <TransitionChild>
            <div className="flex min-h-full items-center justify-center p-4 text-center transition ease-out duration-300 data-closed:opacity-0 data-closed:scale-95">
              {children}
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
