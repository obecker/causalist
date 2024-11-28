import React, { useEffect } from 'react';

const duration = 8000;
const delay = 500;

export default function NotFoundPage() {
  const [translate, setTranslate] = React.useState('-100%');

  useEffect(() => {
    let timeout = setTimeout(() => {
      setTranslate('0');
      timeout = setTimeout(() => {
        window.location.href = '/';
      }, duration + delay);
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="container mx-auto font-cabin font-semibold">
      <div className="m-20">
        <div className="flex justify-center items-center gap-4 text-9xl text-teal-700">
          <span>4</span>
          <img src="/logo.svg" alt="logo" className="size-24 animate-spin-slow " />
          <span>4</span>
        </div>
        <div className="mt-8 text-center text-3xl text-gray-900">
          <p>Der Aufruf dieser Seite ist unzulässig.</p>
          <p className="mt-4">
            Zur weiteren Bearbeitung wird die Sache an
            {' '}
            <a href="/" className="text-teal-700 underline decoration-dotted">Causalist</a>
            {' '}
            verwiesen.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="mt-12 w-2/3 h-4 rounded-full overflow-hidden">
            <div
              className="bg-teal-700 h-full rounded-full transition-transform ease-linear"
              style={{
                transform: `translateX(${translate})`,
                transitionDuration: `${duration}ms`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
