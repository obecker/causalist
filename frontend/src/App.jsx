import { useDocumentTitle, useFavicon } from '@uidotdev/usehooks';

import ApiProvider from './ApiProvider';
import Content from './Content';
import LoginRegistration from './LoginRegistration';

export default function App() {
  const host = window.location.host;
  return (
    <ApiProvider>
      {(apiKey) => (
        <div className="relative min-h-screen">
          { host !== 'www.causalist.de' && <StageDevAppearance host={host} /> }
          <div className="container mx-auto min-w-[352px] p-3 pb-12 text-stone-900 sm:p-8">
            {apiKey ? <Content /> : <LoginRegistration />}
          </div>
          <div className="absolute right-4 bottom-4 text-xs text-stone-400">
            <a
              className="hover:text-teal-700 hover:underline"
              title="GitHub"
              tabIndex="-1"
              href="https://github.com/obecker/causalist"
              target="_blank"
              rel="noreferrer"
            >
              {BUILD_NUMBER}
            </a>
          </div>
        </div>
      )}
    </ApiProvider>
  );
}

function StageDevAppearance({ host }) {
  const stage = host === 'stage.causalist.de';

  useDocumentTitle(stage ? 'S | Causalist' : 'D | Causalist');
  useFavicon('/logo-dev.svg');

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-amber-300 p-1 text-center font-semibold">
        {stage ? 'Stage' : 'Dev'}
      </div>
    </>
  );
}
