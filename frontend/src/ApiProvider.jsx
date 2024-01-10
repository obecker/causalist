import {useSessionStorage} from "@uidotdev/usehooks";
import axios from "axios";
import {createContext} from "react";
import {today} from "./utils";

export const ApiContext = createContext({});

export default function ApiProvider({children}) {

    const [apiKey, setApiKey] = useSessionStorage('apiKey', null);

    const client = axios.create({
        baseURL: "/api"
    });

    const authorization = {Authorization: `Bearer ${apiKey}`};

    function commonFailureHandler(...expectedStatuses) {
        return function (error) {
            if (!error.response) {
                error.userMessage = "Du scheinst offline zu sein – der Server ist derzeit nicht erreichbar.";
            } else if (error.response.status === 401) {
                // API key expired
                setApiKey(null);
                return {};
            } else if (expectedStatuses.includes(error.response.status)) {
                throw error; // handled by the caller
            } else if (error.response.status >= 500) {
                console.log(error);
                error.userMessage = "Oh, da ist wohl etwas schief gegangen. Das sollte eigentlich nicht passieren!";
            } else {
                console.log(error);
                error.userMessage = `Nanu, der Server hat mit dem Status ${error.response.status} geantwortet. Das sollte eigentlich nicht passieren!`;
            }
            throw error;
        }
    }

    const api = {};

    api.register = function (username, password) {
        return client.post('/register', {username: username, password: password})
            .catch(commonFailureHandler(400, 409));
    }

    api.login = function (username, password) {
        return client.post('/login', {username: username, password: password})
            .then(response => {
                setApiKey(response.data.token);
                return response;
            })
            .catch(commonFailureHandler(403));
    }

    api.logout = function () {
        setApiKey(null);
    }

    api.getCases = function (status, type, settled) {
        return client.get('/cases', {
            headers: {...authorization},
            params: {status: status, type: type, settled: settled}
        }).catch(commonFailureHandler());
    }

    api.getCase = function (id) {
        return client.get('/cases/' + id, {headers: {...authorization}})
            .catch(commonFailureHandler())
    }

    api.importCases = function (file) {
        const formData = new FormData();
        formData.append("upload", file, file.name);
        formData.append("date", today());
        return client.post('/cases/import', formData, {
            headers: {...authorization, 'Content-Type': 'multipart/form-data'}
        }).catch(commonFailureHandler())
    }

    api.persistCase = function (caseData) {
        return client.post('/cases', caseData, {headers: {...authorization}})
            .catch(commonFailureHandler(400, 409))
    }

    api.updateCase = function (caseData) {
        return client.put('/cases/' + caseData.id, caseData, {headers: {...authorization}})
            .catch(commonFailureHandler(400, 409))
    }

    api.deleteCase = function (id) {
        return client.delete('/cases/' + id, {headers: {...authorization}})
            .catch(commonFailureHandler())
    }

    return (
        <ApiContext.Provider value={api}>
            {typeof children === "function" ? children(apiKey) : children}
        </ApiContext.Provider>
    );
}
