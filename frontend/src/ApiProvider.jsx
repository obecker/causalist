import { useSessionStorage } from '@uidotdev/usehooks';
import axios from 'axios';
import { createContext, useRef } from 'react';
import { today } from './utils';

export const ApiContext = createContext({});

export default function ApiProvider({ children }) {
  const [apiKey, setApiKey] = useSessionStorage('apiKey', null);

  const controller = useRef(new AbortController());

  const client = axios.create({
    baseURL: '/api',
  });

  const authorization = { Authorization: `Bearer ${apiKey}` };

  function abortPreviousRequest() {
    controller.current.abort();
    controller.current = new AbortController();
  }

  function signal() {
    return controller.current.signal;
  }

  function commonFailureHandler(...expectedStatuses) {
    return function (error) {
      if (error.code === 'ERR_CANCELED') {
        // aborted by the controller, nothing to do
      } else if (!error.response) {
        error.userMessage = 'Du scheinst offline zu sein – der Server ist derzeit nicht erreichbar.';
      } else if (error.response.status === 401) {
        // API key expired
        setApiKey(null);
        return {};
      } else if (expectedStatuses.includes(error.response.status)) {
        throw error; // handled by the caller
      } else if (error.response.status >= 500) {
        console.log(error);
        error.userMessage = 'Oh, da ist wohl etwas schief gegangen. Das sollte eigentlich nicht passieren!';
      } else {
        console.log(error);
        error.userMessage = `Nanu, der Server hat mit dem Status ${error.response.status} geantwortet. Das sollte eigentlich nicht passieren!`;
      }
      throw error;
    };
  }

  const api = {
    register(username, password) {
      return client.post('/register', { username: username, password: password })
        .catch(commonFailureHandler(400, 409));
    },

    login(username, password) {
      return client.post('/login', { username: username, password: password })
        .then((response) => {
          setApiKey(response.data.token);
          return response;
        })
        .catch(commonFailureHandler(403));
    },

    logout() {
      return setApiKey(null);
    },

    getCases(status, type, settled) {
      abortPreviousRequest();
      return client.get('/cases', {
        headers: { ...authorization },
        params: { status: status, type: type, settled: settled },
        signal: signal(),
      }).catch(commonFailureHandler());
    },

    getCase(id) {
      return client.get(`/cases/${id}`, { headers: { ...authorization } })
        .catch(commonFailureHandler());
    },

    importCases(file) {
      const formData = new FormData();
      formData.append('upload', file, file.name);
      formData.append('date', today());
      return client.post('/cases/import', formData, {
        headers: { ...authorization, 'Content-Type': 'multipart/form-data' },
      }).catch(commonFailureHandler());
    },

    persistCase(caseData) {
      return client.post('/cases', caseData, { headers: { ...authorization } })
        .catch(commonFailureHandler(400, 409));
    },

    updateCase(caseData) {
      return client.put(`/cases/${caseData.id}`, caseData, { headers: { ...authorization } })
        .catch(commonFailureHandler(400, 409));
    },

    deleteCase(id) {
      return client.delete(`/cases/${id}`, { headers: { ...authorization } })
        .catch(commonFailureHandler());
    },

    uploadCaseDocument(id, file) {
      const formData = new FormData();
      formData.append('upload', file, file.name);
      formData.append('filename', file.name);
      return client.post(`/cases/${id}/documents`, formData, {
        headers: { ...authorization, 'Content-Type': 'multipart/form-data' },
      }).catch(commonFailureHandler());
    },

    getCaseDocuments(id) {
      return client.get(`/cases/${id}/documents`, { headers: { ...authorization } })
        .catch(commonFailureHandler());
    },

    downloadCaseDocument(id, docId) {
      return client.get(`/cases/${id}/documents/${docId}`, {
        headers: { ...authorization },
        responseType: 'blob',
      }).catch(commonFailureHandler(404));
    },

    deleteCaseDocument(id, docId) {
      return client.delete(`/cases/${id}/documents/${docId}`, { headers: { ...authorization } })
        .catch(commonFailureHandler());
    },
  };

  return (
    <ApiContext.Provider value={api}>
      {typeof children === 'function' ? children(apiKey) : children}
    </ApiContext.Provider>
  );
}
