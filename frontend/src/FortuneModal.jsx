import { DialogPanel, DialogTitle } from '@headlessui/react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import ModalDialog from './ModalDialog';
import { statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { typeMap } from './type';

const lineHeight = 22;

export function FortuneModal({ isOpen, setIsOpen, cases }) {
  const [fortuneCase, setFortuneCase] = useState(null);
  const [revealDetails, setRevealDetails] = useState(false);

  useEffect(() => {
    let newFortuneCase = cases && isOpen ? cases[Math.floor(Math.random() * cases.length)] : null;
    setFortuneCase(newFortuneCase);
    if (!newFortuneCase) {
      setIsOpen(false);
    }
  }, [cases, isOpen, setIsOpen]);

  function close() {
    setIsOpen(false);
    setRevealDetails(false);
  }

  return fortuneCase && (
    <ModalDialog isOpen={isOpen} onClose={close}>
      <DialogPanel className={clsx('p-6 w-full max-w-md sm:max-w-lg md:max-w-xl text-stone-900',
        'transform transition-all overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl')}
      >
        <DialogTitle as="h3" className="text-lg sm:text-xl font-semibold flex justify-center gap-2 sm:gap-4">
          <span>🎉🎉🎉</span>
          <span>Akte des Tages</span>
          <span>🎉🎉🎉</span>
        </DialogTitle>
        <div className="mt-8">
          <FortuneWheel reference={fortuneCase.ref} done={() => setRevealDetails(true)} />
        </div>
        <div
          className="mt-8 relative max-h-lvh overflow-y-scroll transition-opacity duration-1000"
          style={{
            maxHeight: 'calc(100vh - 20rem)',
            opacity: revealDetails ? 1 : 0,
          }}
        >
          <div className="flex items-end gap-2">
            <span className="text-teal-700 text-sm font-bold">{typeMap[fortuneCase.type]}</span>
            {fortuneCase.parties}
          </div>
          <div className="mt-2">
            {fortuneCase.area}
          </div>
          <div className="mt-2 flex gap-2">
            <StatusIcon status={fortuneCase.status} />
            {statusLabels[fortuneCase.status]}
          </div>
          <div className="mt-2">
            {fortuneCase.statusNote}
          </div>
          <div className="mt-2">
            {fortuneCase.memo}
          </div>
        </div>
        <div className="mt-4 w-full flex justify-end">
          <button
            className={clsx('flex w-20 justify-center px-3 py-1.5 text-sm font-semibold leading-6 rounded-md',
              'bg-teal-700 text-white shadow-sm hover:bg-teal-600',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700')}
            onClick={close}
          >
            Super!
          </button>
        </div>
      </DialogPanel>
    </ModalDialog>
  );
}

function FortuneWheel({ reference, done = () => {} }) {
  const finishedWheels = useRef(0);

  useEffect(() => {
    finishedWheels.current = 0;
  }, [reference]);

  function finishedWheel() {
    finishedWheels.current += 1;
    if (finishedWheels.current === 9) { // there are 9 single wheels below
      done();
    }
  }

  return (
    <div
      className="flex justify-center text-center text-xl text-stone-900 font-extrabold"
      style={{
        lineHeight: `${lineHeight}px`,
      }}
    >
      <DigitWheel digit={Math.trunc(reference.entity / 100) % 10} done={finishedWheel} />
      <DigitWheel digit={Math.trunc(reference.entity / 10) % 10} direction="down" done={finishedWheel} />
      <DigitWheel digit={reference.entity % 10} done={finishedWheel} />
      <Space />
      <RegisterWheel register={reference.register} direction="down" done={finishedWheel} />
      <Space />
      <DigitWheel digit={Math.trunc(reference.number / 100) % 10} done={finishedWheel} />
      <DigitWheel digit={Math.trunc(reference.number / 10) % 10} direction="down" done={finishedWheel} />
      <DigitWheel digit={reference.number % 10} done={finishedWheel} />
      <Space>/</Space>
      <DigitWheel digit={Math.trunc(reference.year / 10) % 10} direction="down" done={finishedWheel} />
      <DigitWheel digit={reference.year % 10} done={finishedWheel} />
    </div>
  );
}

function DigitWheel({ digit, direction = 'up', done = () => {} }) {
  const count = 10;
  const digitStrip = Array.from(Array(2 * count + 3), (_, index) => (index + 9) % 10);
  const isDown = direction === 'down';

  const [shift, setShift] = useState(isDown ? digitStrip.length - 2 : 1);
  const [selectedClassName, setSelectedClassName] = useState('');

  useEffect(() => {
    setSelectedClassName('');
    const timeout = setTimeout(
      () => setShift(digit + 1 + (isDown ? 0 : (2 - Math.sign(digit)) * count)),
      100);
    return () => clearTimeout(timeout);
  }, [digit, isDown]);

  return (
    <WheelWindow
      shift={shift}
      done={() => {
        setSelectedClassName('text-teal-700');
        done();
      }}
    >
      {digitStrip.map((digit, index) => (
        <div key={index} className={shift === index ? selectedClassName : null}>{digit}</div>
      ))}
    </WheelWindow>
  );
}

function RegisterWheel({ register, direction = 'up', done = () => {} }) {
  const registers = ['O', 'OH', 'S', 'T'];
  const registerStrip = [...(registers.slice(-1)), ...registers, ...registers, ...registers, ...(registers.slice(0, 2))];
  const targetIndex = registers.indexOf(register);
  const isDown = direction === 'down';

  const [shift, setShift] = useState(isDown ? registerStrip.length - 2 : 1);
  const [selectedClassName, setSelectedClassName] = useState('');

  useEffect(() => {
    setSelectedClassName('');
    const timeout = setTimeout(
      () => setShift(targetIndex + 1 + (isDown ? 0 : (3 - Math.sign(targetIndex)) * registers.length)),
      100);
    return () => clearTimeout(timeout);
  }, [isDown, registers.length, targetIndex]);

  if (targetIndex < 0) {
    console.error('Illegal register sign', register);
    return;
  }

  return (
    <WheelWindow
      shift={shift}
      width="w-12"
      done={() => {
        setSelectedClassName('text-teal-700');
        done();
      }}
    >
      {registerStrip.map((reg, index) => (
        <div key={index} className={shift === index ? selectedClassName : null}>{reg}</div>
      ))}
    </WheelWindow>
  );
}

function WheelWindow({ shift, children, width = 'w-8', done }) {
  return (
    <div className={`border border-gray-200 px-1 py-2 ${width} h-10 shadow-inner overflow-hidden relative`}>
      <div
        className="flex flex-col transition-transform"
        style={{
          transform: `translateY(-${shift * lineHeight}px)`,
          transitionDuration: `${Math.floor(Math.random() * 1500) + 3000}ms`,
        }}
        onTransitionEnd={done}
      >
        {children}
      </div>
      <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-stone-400/40" />
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-stone-400/40" />
    </div>
  );
}

function Space({ children }) {
  return (
    <div className="px-1.5 py-2">{children}</div>
  );
}
