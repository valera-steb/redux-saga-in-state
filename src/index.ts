import { Func1, Middleware, MiddlewareAPI } from "redux";

export type ISagaFunction = any;

export function createSaga(...steps: any[]): ISagaFunction {
    return { saga: "root" };
}

export interface ISagaMiddleware extends Middleware {
    run: () => Promise<any>;

    //todo: оказывается redux-saga позволяет создавать контекст прямо на корне - надо это повторить
    //setContext: Func1<any, void>;
}

export interface ISagaMiddlewareState {}

export interface ISagaMiddlewareOptions {
    sagas: ISagaFunction[];
    ignoreReduxDevTools?: boolean;
    sagaMiddlewareStateSelector?: Func1<any, ISagaMiddlewareState>;
}

export function createSagaMiddleware(
    options: ISagaMiddlewareOptions
): ISagaMiddleware {
    let middlewareAPI: MiddlewareAPI;
    const middleware: ISagaMiddleware = store => {
        middlewareAPI = store;
        const proceedMiddlewareCall = buildMiddlewareRuntime(
            options,
            middlewareAPI
        );
        return next => action => proceedMiddlewareCall(next, action);
    };
    middleware.run = () => launchSagaRuntime(options, middlewareAPI);
    return middleware;
}

export const launchSagaMiddlewareAction = {
    type: "@launch/sagaMiddleware",
};

const anyWindow = (window ?? {}) as any;

async function launchSagaRuntime(
    options: ISagaMiddlewareOptions,
    middlewareAPI: MiddlewareAPI
) {
    if (!middlewareAPI)
        throw new Error(
            "You should run() middleware after it would be added to store"
        );

    return await new Promise<void>(resolve => {
        if (
            options.ignoreReduxDevTools ||
            !anyWindow.__REDUX_DEVTOOLS_EXTENSION__
        ) {
            middlewareAPI.dispatch(launchSagaMiddlewareAction);
            return resolve();
        }

        //todo: wait for redux-dev-tools init event
    });
}

function buildMiddlewareRuntime(
    options: ISagaMiddlewareOptions,
    middlewareAPI: MiddlewareAPI
) {
    const sagaMiddlewareStateSelector: Func1<any, ISagaMiddlewareState> =
        options?.sagaMiddlewareStateSelector ?? (s => s.sagaMiddlewareState);

    return (next, action) => next(action);
}
