import {CheckCircleIcon, ExclamationCircleIcon, XCircleIcon} from "@heroicons/react/20/solid";
import {EyeIcon, EyeSlashIcon} from "@heroicons/react/24/outline";
import {useContext, useEffect, useRef, useState} from "react";
import {ApiContext} from "./ApiProvider";
import FailureAlert from "./FailureAlert";

export default function LoginRegistration() {
    const [showLogin, setShowLogin] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <img src="/logo.svg" alt="Logo" width="80" height="80" className="mx-auto"/>
                {
                    showLogin ? <LoginForm successMessage={successMessage} setSuccessMessage={setSuccessMessage}
                                           toggleForm={() => setShowLogin(false)}/>
                        : <RegistrationForm setSuccessMessage={setSuccessMessage}
                                            toggleForm={() => setShowLogin(true)}/>
                }
            </div>
        </div>
    );
}

function LoginForm({successMessage, setSuccessMessage, toggleForm}) {

    const api = useContext(ApiContext);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginFailure, setLoginFailure] = useState('');
    const [disabled, setDisabled] = useState(false);

    useEffect(() => {
        setDisabled(username === '' || password === '')
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
            <h2 className="mt-8 text-center text-2xl font-bold leading-9 tracking-tight text-stone-900">
                Causalist Login
            </h2>
            <div
                className={`${successMessage ? 'flex' : 'hidden'} items-center p-4 mt-8 text-sm text-teal-800 rounded-lg bg-teal-50`}
                role="alert">
                <CheckCircleIcon className="w-4 h-4 me-3 flex-shrink-0 inline "/>
                <span className="font-medium">{successMessage}</span>
            </div>
            <FailureAlert message={loginFailure} className="mt-8"/>
            <form className="mt-8 space-y-6" action="#" method="POST" onSubmit={login}>
                <FormInput name="username" label="Nutzername" type="text" value={username}
                           onChange={(e) => setUsername(e.target.value)}/>
                <FormInput name="password" label="Passwort" type="password" value={password}
                           onChange={(e) => setPassword(e.target.value)}/>
                <FormSubmit label="Login" disabled={disabled}/>
                <FormToggle label="zur Registrierung" toggle={toggleForm}/>
            </form>
        </>
    );
}

function RegistrationForm({setSuccessMessage, toggleForm}) {
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
        setDisabled(!(passwordValidationLength && passwordValidationCase && passwordValidationNonAlpha && usernameValidation));
    }, [passwordValidationCase, passwordValidationLength, passwordValidationNonAlpha, usernameValidation]);

    function registration(event) {
        setUsername(username);
        event.preventDefault();

        setRegistrationFailure('');
        setDisabled(true);
        api.register(username, password)
            .then((response) => {
                console.log(response.status);
                setDisabled(false);
                setSuccessMessage("Wunderbar, das hat geklappt! Bitte logge dich jetzt ein.")
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
            <h2 className="mt-8 text-center text-2xl font-bold leading-9 tracking-tight text-stone-900">
                Causalist Registrierung
            </h2>
            <FailureAlert message={registrationFailure} className="mt-8"/>
            <form className="mt-8 space-y-6" action="#" method="POST" autoComplete="off" onSubmit={registration}>
                <FormInput name="username" label="Nutzername" type="text" value={username}
                           onInput={removeWhitespace}
                           onChange={(e) => setUsername(e.target.value)}>
                    <div className="text-xs mt-1 flex align-middle justify-start gap-4">
                        <Validation value={username} isValid={usernameValidation} label="min 4 Zeichen"/>
                    </div>
                </FormInput>
                <FormInput name="password" label="Passwort" type="password" value={password} reveal={true}
                           onChange={(e) => setPassword(e.target.value)}>
                    <div className="text-xs mt-1 flex align-middle justify-start gap-4">
                        <Validation value={password} isValid={passwordValidationLength} label="min 10 Zeichen"/>
                        <Validation value={password} isValid={passwordValidationCase} label="aAbBcC"/>
                        <Validation value={password} isValid={passwordValidationNonAlpha} label="123!?#&"/>
                    </div>
                </FormInput>
                <FormSubmit label="Registrieren" disabled={disabled}/>
                <FormToggle label="zum Login" toggle={toggleForm}/>
            </form>
        </>
    );
}

function FormInput({name, label, type, value, reveal = false, onChange, onInput, children}) {
    const [revealed, setRevealed] = useState(false);
    const inputRef = useRef(null);

    function toggleRevealed() {
        setRevealed(!revealed);
        inputRef.current.focus();
    }

    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium leading-6 text-stone-900">{label}</label>
            <div className="mt-2 relative">
                <input
                    id={name}
                    name={name}
                    ref={inputRef}
                    className={`block w-full rounded-lg border-0 py-1.5 text-stone-900 shadow-sm 
                                ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 
                                focus:ring-2 focus:ring-inset focus:ring-teal-700 sm:text-sm sm:leading-6
                                ${reveal ? 'pr-9' : ''}`}
                    type={revealed ? 'text' : type}
                    required="required"
                    minLength={3}
                    value={value}
                    onInput={onInput}
                    onChange={onChange}
                />
                {reveal &&
                    <div className="absolute bottom-0 top-0 right-0 pr-2.5 py-2 text-stone-400 cursor-pointer"
                         onClick={toggleRevealed}>
                        {revealed ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                    </div>
                }
            </div>
            {children}
        </div>
    );
}

function FormSubmit({label, disabled}) {
    return (
        <div>
            <button
                type="submit"
                disabled={disabled}
                className="flex w-full justify-center rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-600 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                {label}
            </button>
        </div>
    );
}

function FormToggle({label, toggle}) {
    return (
        <div>
            <button
                type="button"
                className="block mx-auto text-teal-700 text-sm outline-none hover:underline focus-visible:underline"
                onClick={toggle}>
                {label}
            </button>
        </div>
    );
}

function Validation({value, isValid, label}) {

    function validationColor() {
        if (!value) {
            return 'text-stone-400';
        }
        return isValid ? 'text-teal-700' : 'text-rose-700';
    }

    return (
        <span className={`flex ${validationColor()}`}>
            <ValidationIcon value={value} isValid={isValid} className="w-4 h-4 mr-0.5"/>
            {label}
        </span>
    );
}

function ValidationIcon({value, isValid, className}) {
    if (!value) {
        return <ExclamationCircleIcon className={className}/>;
    }
    return isValid ? <CheckCircleIcon className={className}/> : <XCircleIcon className={className}/>;
}
