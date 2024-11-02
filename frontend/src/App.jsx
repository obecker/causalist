import { useDocumentTitle, useFavicon } from '@uidotdev/usehooks';

import ApiProvider from './ApiProvider';
import Content from './Content';
import LoginRegistration from './LoginRegistration';

export default function App() {
  const host = window.location.host;
  return (
    <ApiProvider>
      {(apiKey) => (
        <div className="min-h-screen relative">
          { host !== 'www.causalist.de' && <StageDevAppearance host={host} /> }
          <div className="container mx-auto p-3 sm:p-8 pb-12 min-w-[352px] text-stone-900">
            {apiKey ? <Content /> : <LoginRegistration />}
          </div>
          <div className="absolute bottom-4 right-4 text-xs text-stone-400">
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
      <div className="p-1 bg-amber-300 font-semibold text-center sticky top-0 z-50 w-full">
        {stage ? 'Stage' : 'Dev'}
      </div>
    </>
  );
}
