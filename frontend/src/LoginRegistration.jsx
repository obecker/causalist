import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx/lite';
import { useContext, useEffect, useRef, useState } from 'react';

import { ApiContext } from './ApiContext';
import FailureAlert from './FailureAlert';

export default function LoginRegistration() {
  const [showLogin, setShowLogin] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img src="/logo.svg" alt="Logo" width="80" height="80" className="mx-auto" />
        {
          showLogin
            ? (
                <LoginForm
                  successMessage={successMessage}
                  setSuccessMessage={setSuccessMessage}
                  toggleForm={() => setShowLogin(false)}
                />
              )
            : (
                <RegistrationForm
                  setSuccessMessage={setSuccessMessage}
                  toggleForm={() => setShowLogin(true)}
                />
              )
        }
      </div>
    </div>
  );
}

function LoginForm({ successMessage, setSuccessMessage, toggleForm }) {
  const api = useContext(ApiContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginFailure, setLoginFailure] = useState('');
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setDisabled(username === '' || password === '');
  }, [username, password]);

  function login(event) {
    event.preventDefault();

    setSuccessMessage('');
    setLoginFailure('');
    setDisabled(true);
    api.login(username, password)
      .then(() => {
        setDisabled(false);
      })
      .catch((error) => {
        if (error.response.status === 403) {
          setLoginFailure('Das hat leider nicht geklappt.');
        } else {
          setLoginFailure(error.userMessage);
        }
        setDisabled(false);
      });
  }

  return (
    <>
      <div className="text-center">
        <h1 className="mt-8 font-kaushanScript text-4xl text-teal-800">Causalist</h1>
        <h2 className="mt-4 text-2xl font-semibold">Login</h2>
      </div>
      {successMessage && (
        <div className="mt-8 flex items-center rounded-lg bg-teal-50 p-4 text-sm text-teal-800" role="alert">
          <CheckCircleIcon className="me-3 inline size-4 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      <FailureAlert message={loginFailure} className="mt-8" />
      <form className="mt-8 space-y-6" action="#" method="POST" onSubmit={login} autoComplete="off">
        <FormInput
          name="username"
          label="Nutzername"
          type="text"
          value={username}
          inputMode="email"
          focus={true}
          onChange={(e) => setUsername(e.target.value)}
        />
        <FormInput
          name="password"
          label="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormSubmit label="Login" disabled={disabled} />
        <FormToggle label="zur Registrierung" toggle={toggleForm} />
      </form>
    </>
  );
}

function RegistrationForm({ setSuccessMessage, toggleForm }) {
  const api = useContext(ApiContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registrationFailure, setRegistrationFailure] = useState('');
  const [disabled, setDisabled] = useState(false);

  const [passwordValidationLength, setPasswordValidationLength] = useState(false);
  const [passwordValidationCase, setPasswordValidationCase] = useState(false);
  const [passwordValidationNonAlpha, setPasswordValidationNonAlpha] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState(false);

  useEffect(() => {
    let validLength = password.length >= 10;
    let lowerCase = false;
    let upperCase = false;
    let nonAlpha = false;
    for (let c of password) {
      if (c >= 'a' && c <= 'z') lowerCase = true;
      else if (c >= 'A' && c <= 'Z') upperCase = true;
      else nonAlpha = true;
    }
    let validCase = lowerCase && upperCase;

    setPasswordValidationLength(validLength);
    setPasswordValidationCase(validCase);
    setPasswordValidationNonAlpha(nonAlpha);
  }, [password]);

  useEffect(() => {
    setUsernameValidation(username.length >= 4);
  }, [username]);

  useEffect(() => {
    setDisabled(
      !(passwordValidationLength && passwordValidationCase && passwordValidationNonAlpha && usernameValidation),
    );
  }, [passwordValidationCase, passwordValidationLength, passwordValidationNonAlpha, usernameValidation]);

  function registration(event) {
    event.preventDefault();

    setRegistrationFailure('');
    setDisabled(true);
    api.register(username, password)
      .then((response) => {
        console.log(response.status);
        setDisabled(false);
        setSuccessMessage('Wunderbar, das hat geklappt! Bitte logge dich jetzt ein.');
        toggleForm();
      })
      .catch((error) => {
        if (error.response.status === 409) {
          setRegistrationFailure('Dieser Nutzername ist leider schon vergeben.');
        } else if (error.response.status === 400) {
          setRegistrationFailure(`Oops, da ist leider etwas schiefgegangen: ${error.response.message}`);
        } else {
          setRegistrationFailure(error.userMessage);
        }
        setDisabled(false);
      });
  }

  function removeWhitespace(e) {
    if (/\s/g.test(e.target.value)) e.target.value = e.target.value.replace(/\s/g, '');
  }

  return (
    <>
      <div className="text-center">
        <h1 className="mt-8 font-kaushanScript text-4xl text-teal-800">Causalist</h1>
        <h2 className="mt-4 text-2xl font-semibold">Registrierung</h2>
      </div>
      <FailureAlert message={registrationFailure} className="mt-8" />
      <form className="mt-8 space-y-6" action="#" method="POST" autoComplete="off" onSubmit={registration}>
        <FormInput
          name="username"
          label="Nutzername"
          type="text"
          value={username}
          inputMode="email"
          focus={true}
          onInput={removeWhitespace}
          onChange={(e) => setUsername(e.target.value)}
        >
          <div className="mt-1 flex justify-start text-xs">
            <ValidationInfo value={username} isValid={usernameValidation} label="min 4 Zeichen" />
          </div>
        </FormInput>
        <FormInput
          name="password"
          label="Passwort"
          type="password"
          value={password}
          reveal={true}
          onChange={(e) => setPassword(e.target.value)}
        >
          <div className="mt-1 flex justify-start gap-5 text-xs">
            <ValidationInfo value={password} isValid={passwordValidationLength} label="min 10 Zeichen" />
            <ValidationInfo value={password} isValid={passwordValidationCase} label="aAbBcC" />
            <ValidationInfo value={password} isValid={passwordValidationNonAlpha} label="123!?#&" />
          </div>
        </FormInput>
        <FormSubmit label="Registrieren" disabled={disabled} />
        <FormToggle label="zum Login" toggle={toggleForm} />
      </form>
    </>
  );
}

function FormInput({
  name,
  label,
  type,
  value,
  inputMode = 'text',
  focus = false,
  reveal = false,
  onChange,
  onInput,
  children,
}) {
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (focus) {
      inputRef.current.focus();
    }
  }, [focus]);

  function toggleRevealed() {
    setRevealed((b) => !b);
    inputRef.current.focus();
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm leading-6 font-medium text-stone-900">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={name}
          name={name}
          inputMode={inputMode}
          ref={inputRef}
          className={clsx(
            'block w-full rounded-md border-none py-1.5 text-stone-900 ring-1 shadow-xs ring-stone-300 ring-inset placeholder:text-stone-400 focus:ring-2 focus:ring-teal-700 focus:ring-inset sm:text-sm sm:leading-6',
            reveal && 'pr-9',
          )}
          type={revealed ? 'text' : type}
          required="required"
          minLength={3}
          value={value}
          onInput={onInput}
          onChange={onChange}
        />
        {reveal && (
          <div
            className="absolute top-0 right-0 bottom-0 py-2 pr-2.5 text-stone-400 hover:text-stone-900"
            onClick={toggleRevealed}
          >
            {revealed ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function FormSubmit({ label, disabled }) {
  return (
    <div>
      <button
        type="submit"
        disabled={disabled}
        className="flex w-full justify-center rounded-md bg-teal-700 px-3 py-1.5 text-sm leading-6 font-semibold text-white shadow-xs hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {label}
      </button>
    </div>
  );
}

function FormToggle({ label, toggle }) {
  return (
    <div>
      <button
        type="button"
        className="mx-auto block text-sm text-teal-700 outline-hidden hover:underline focus-visible:underline"
        onClick={toggle}
      >
        {label}
      </button>
    </div>
  );
}

function ValidationInfo({ value, isValid, label }) {
  function validationColor() {
    if (!value) {
      return 'text-stone-400';
    }
    return isValid ? 'text-teal-700' : 'text-rose-700';
  }

  return (
    <span className={clsx('flex items-center', validationColor())}>
      <ValidationIcon value={value} isValid={isValid} className="me-1 inline size-4" />
      {label}
    </span>
  );
}

function ValidationIcon({ value, isValid, className }) {
  if (!value) {
    return <ExclamationCircleIcon className={className} />;
  }
  return isValid ? <CheckCircleIcon className={className} /> : <XCircleIcon className={className} />;
}
