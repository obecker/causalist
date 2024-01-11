import {useDocumentTitle, useFavicon} from "@uidotdev/usehooks";
import ApiProvider from "./ApiProvider";
import Content from "./Content";
import LoginRegistration from "./LoginRegistration";

export default function App() {

    return (
        <ApiProvider>
            {apiKey => (
                <div className="min-h-screen relative">
                    <StageDevAppearance/>
                    <div className="container mx-auto p-3 sm:p-8 pb-12 min-w-[352px] text-stone-900">
                        {apiKey ? <Content/> : <LoginRegistration/>}
                    </div>
                    <div className="absolute bottom-4 right-4 text-xs text-stone-400">{BUILD_NUMBER}</div>
                </div>
            )}
        </ApiProvider>
    )
}

function StageDevAppearance() {
    const host = window.location.host;
    if (host === "www.causalist.de") { // prod
        return null;
    }

    const stage = host === "stage.causalist.de";

    useDocumentTitle(stage ? "S | Causalist" : "D | Causalist");
    useFavicon("/logo-dev.svg");

    return (
        <>
            <div className="h-8 p-1 bg-amber-300 font-semibold text-center fixed left-0 top-0 right-0 z-50 w-full">
                {stage ? "Stage" : "Dev"}
            </div>
            <div className="h-8"/>
        </>
    );
}
