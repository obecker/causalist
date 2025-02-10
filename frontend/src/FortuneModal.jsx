import { DialogPanel, DialogTitle } from '@headlessui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ConfettiExplosion from 'react-confetti-explosion';

import ModalDialog from './ModalDialog';
import { statusLabels } from './status';
import StatusIcon from './StatusIcon';
import { typeMap } from './type';

const lineHeight = 22;

export function FortuneModal({ isOpen, setIsOpen, cases }) {
  const [fortuneCase, setFortuneCase] = useState(null);
  const [revealDetails, setRevealDetails] = useState(false);
  const [explode, setExplode] = useState(false);

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
    setExplode(false);
  }

  return (fortuneCase && (
    <ModalDialog isOpen={isOpen} onClose={close}>
      <DialogPanel
        className="w-full max-w-md p-6 sm:max-w-lg md:max-w-xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all"
      >
        <DialogTitle
          as="h3"
          className="flex justify-center gap-2 text-lg font-semibold sm:gap-4 sm:text-xl"
          onClick={() => setExplode(true)}
        >
          <span style={{ opacity: revealDetails ? 1 : 0 }}>🎉🎉🎉</span>
          <span>Akte des Tages</span>
          <span style={{ opacity: revealDetails ? 1 : 0 }}>🎉🎉🎉</span>
        </DialogTitle>
        <div className="flex justify-center">
          {explode && (
            <ConfettiExplosion
              particleCount={200}
              colors={['#e11d48', '#f59e0b', '#059669', '#2563eb', '#9333ea']} // marker colors from index.css
              force={0.6}
              zIndex={1000}
              onComplete={() => setExplode(false)}
            />
          )}
        </div>
        <div className="mt-8">
          <FortuneWheel
            reference={fortuneCase.ref}
            onFinish={() => {
              setRevealDetails(true);
              setExplode(true);
            }}
          />
        </div>
        <div
          className="relative mt-8 max-h-lvh overflow-y-scroll transition-opacity duration-1000"
          style={{
            maxHeight: 'calc(100vh - 20rem)',
            opacity: revealDetails ? 1 : 0,
          }}
        >
          <div className="flex items-end gap-2">
            <span className="text-sm font-bold text-teal-700">{typeMap[fortuneCase.type]}</span>
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
        <div className="mt-4 flex w-full justify-end">
          <button
            className="flex w-20 justify-center rounded-md px-3 py-1.5 text-sm leading-6 font-semibold bg-teal-700 text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={close}
          >
            Super!
          </button>
        </div>
      </DialogPanel>
    </ModalDialog>
  ));
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
      className="flex justify-center text-center text-xl font-extrabold text-stone-900"
      style={{
        lineHeight: `${lineHeight}px`,
      }}
    >
      <DigitWheel digit={Math.trunc(reference.entity / 100) % 10} delay={100} onStart={started} onFinish={finished} />
      <DigitWheel
        digit={Math.trunc(reference.entity / 10) % 10}
        direction="down"
        delay={200}
        onStart={started}
        onFinish={finished}
      />
      <DigitWheel digit={reference.entity % 10} delay={300} onStart={started} onFinish={finished} />
      <Space />
      <RegisterWheel register={reference.register} direction="down" delay={400} onStart={started} onFinish={finished} />
      <Space />
      <DigitWheel digit={Math.trunc(reference.number / 100) % 10} delay={500} onStart={started} onFinish={finished} />
      <DigitWheel
        digit={Math.trunc(reference.number / 10) % 10}
        direction="down"
        delay={600}
        onStart={started}
        onFinish={finished}
      />
      <DigitWheel digit={reference.number % 10} delay={700} onStart={started} onFinish={finished} />
      <Space>/</Space>
      <DigitWheel
        digit={Math.trunc(reference.year / 10) % 10}
        delay={800}
        direction="down"
        onStart={started}
        onFinish={finished}
      />
      <DigitWheel digit={reference.year % 10} delay={900} onStart={started} onFinish={finished} />
    </div>
  );
}

const createStrip = (array, repetitions) => [
  ...array.slice(-1),
  ...Array(repetitions).fill(array).flat(),
  ...array.slice(0, 2),
];
const digitStrip = createStrip([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
const registerStrip = createStrip(['O', 'OH', 'S', 'T'], 7);

function DigitWheel({ digit, direction = 'up', delay, onStart, onFinish }) {
  return (
    <SpinningWheel
      value={digit}
      valueStrip={digitStrip}
      direction={direction}
      delay={delay}
      onStart={onStart}
      onFinish={onFinish}
    />
  );
}

function RegisterWheel({ register, direction = 'up', delay, onStart, onFinish }) {
  return (
    <SpinningWheel
      value={register}
      valueStrip={registerStrip}
      direction={direction}
      delay={delay}
      widthClass="w-12"
      onStart={onStart}
      onFinish={onFinish}
    />
  );
}

function SpinningWheel({ value, valueStrip, direction, delay, widthClass = 'w-8', onStart, onFinish }) {
  const isDown = direction === 'down';
  const targetShift = isDown ? valueStrip.indexOf(value, 1) : valueStrip.lastIndexOf(value, valueStrip.length - 2);

  const [shift, setShift] = useState(isDown ? valueStrip.length - 2 : 1);
  const [selectedClassName, setSelectedClassName] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      onStart();
      setShift(targetShift);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, onStart, targetShift]);

  if (targetShift < 0) {
    console.error('Illegal value', value, 'not contained in', valueStrip);
    return;
  }

  return (
    <div className={`border border-stone-200 px-1 py-2 ${widthClass} relative h-10 overflow-hidden shadow-inner`}>
      <div
        className="flex flex-col transition-transform"
        style={{
          transform: `translateY(-${shift * lineHeight}px)`,
          transitionDuration: `${Math.floor(Math.random() * 1500) + 3000}ms`,
        }}
        onTransitionEnd={() => {
          setSelectedClassName('text-teal-700');
          onFinish();
        }}
      >
        {valueStrip.map((v, index) => (
          <div key={index} className={shift === index ? selectedClassName : null}>{v}</div>
        ))}
      </div>
      <div className="absolute top-0 right-0 left-0 h-3 bg-linear-to-b from-stone-400/40" />
      <div className="absolute right-0 bottom-0 left-0 h-3 bg-linear-to-t from-stone-400/40" />
    </div>
  );
}

function Space({ children }) {
  return (
    <div className="px-1.5 py-2">{children}</div>
  );
}
