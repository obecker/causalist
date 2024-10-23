import { DialogPanel, DialogTitle } from '@headlessui/react';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
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
          <FortuneWheel reference={fortuneCase.ref} onFinish={() => setRevealDetails(true)} />
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

function FortuneWheel({ reference, onFinish = () => {} }) {
  const startedWheels = useRef(0);
  const finishedWheels = useRef(0);

  useEffect(() => {
    startedWheels.current = 0;
    finishedWheels.current = 0;
  }, [reference]);

  const started = useCallback(() => {
    startedWheels.current += 1;
  }, []);

  const finished = useCallback(() => {
    finishedWheels.current += 1;
    if (finishedWheels.current === startedWheels.current) {
      onFinish();
    }
  }, [onFinish]);

  return (
    <div
      className="flex justify-center text-center text-xl text-stone-900 font-extrabold"
      style={{
        lineHeight: `${lineHeight}px`,
      }}
    >
      <DigitWheel digit={Math.trunc(reference.entity / 100) % 10} delay={100} onStart={started} onFinish={finished} />
      <DigitWheel digit={Math.trunc(reference.entity / 10) % 10} direction="down" delay={200} onStart={started} onFinish={finished} />
      <DigitWheel digit={reference.entity % 10} delay={300} onStart={started} onFinish={finished} />
      <Space />
      <RegisterWheel register={reference.register} direction="down" delay={400} onStart={started} onFinish={finished} />
      <Space />
      <DigitWheel digit={Math.trunc(reference.number / 100) % 10} delay={500} onStart={started} onFinish={finished} />
      <DigitWheel digit={Math.trunc(reference.number / 10) % 10} direction="down" delay={600} onStart={started} onFinish={finished} />
      <DigitWheel digit={reference.number % 10} delay={700} onStart={started} onFinish={finished} />
      <Space>/</Space>
      <DigitWheel digit={Math.trunc(reference.year / 10) % 10} delay={800} direction="down" onStart={started} onFinish={finished} />
      <DigitWheel digit={reference.year % 10} delay={900} onStart={started} onFinish={finished} />
    </div>
  );
}

function createStrip(array, repetitions) {
  return [...(array.slice(-1)), ...(Array(repetitions).fill(array).flat()), ...(array.slice(0, 2))];
}

const digitStrip = createStrip([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);

function DigitWheel({ digit, direction = 'up', delay = 100, onStart = () => {}, onFinish = () => {} }) {
  const isDown = direction === 'down';
  const targetShift = isDown ? digitStrip.indexOf(digit, 1) : digitStrip.lastIndexOf(digit, digitStrip.length - 2);

  const [shift, setShift] = useState(isDown ? digitStrip.length - 2 : 1);
  const [selectedClassName, setSelectedClassName] = useState('');

  useEffect(() => {
    setSelectedClassName('');
    const timeout = setTimeout(
      () => {
        onStart();
        setShift(targetShift);
      },
      delay);
    return () => clearTimeout(timeout);
  }, [delay, onStart, targetShift]);

  return (
    <WheelWindow
      shift={shift}
      onFinish={() => {
        setSelectedClassName('text-teal-700');
        onFinish();
      }}
    >
      {digitStrip.map((digit, index) => (
        <div key={index} className={shift === index ? selectedClassName : null}>{digit}</div>
      ))}
    </WheelWindow>
  );
}

const registerStrip = createStrip(['O', 'OH', 'S', 'T'], 5);

function RegisterWheel({ register, direction = 'up', delay = 100, onStart = () => {}, onFinish = () => {} }) {
  const isDown = direction === 'down';
  const targetShift = isDown ? registerStrip.indexOf(register, 1) : registerStrip.lastIndexOf(register, registerStrip.length - 2);

  const [shift, setShift] = useState(isDown ? registerStrip.length - 2 : 1);
  const [selectedClassName, setSelectedClassName] = useState('');

  useEffect(() => {
    setSelectedClassName('');
    const timeout = setTimeout(
      () => {
        onStart();
        setShift(targetShift);
      },
      delay);
    return () => clearTimeout(timeout);
  }, [delay, onStart, targetShift]);

  if (targetShift < 0) {
    console.error('Illegal register sign', register);
    return;
  }

  return (
    <WheelWindow
      shift={shift}
      width="w-12"
      onFinish={() => {
        setSelectedClassName('text-teal-700');
        onFinish();
      }}
    >
      {registerStrip.map((reg, index) => (
        <div key={index} className={shift === index ? selectedClassName : null}>{reg}</div>
      ))}
    </WheelWindow>
  );
}

function WheelWindow({ shift, children, width = 'w-8', onFinish }) {
  return (
    <div className={`border border-gray-200 px-1 py-2 ${width} h-10 shadow-inner overflow-hidden relative`}>
      <div
        className="flex flex-col transition-transform"
        style={{
          transform: `translateY(-${shift * lineHeight}px)`,
          transitionDuration: `${Math.floor(Math.random() * 1500) + 3000}ms`,
        }}
        onTransitionEnd={onFinish}
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
