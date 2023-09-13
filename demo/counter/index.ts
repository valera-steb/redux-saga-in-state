import { applyMiddleware, compose, legacy_createStore, Store } from "redux";
import { logActionMiddleware } from "./logActionMiddleware";
import { buildPromiseMiddleware } from "./promiseMiddleware";

function getCompose() {
    const reduxCompose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    return reduxCompose
        ? reduxCompose({
              //trace: true
          })
        : compose;
}

function reducer(state = { count: 0, startOn: Date.now() }, action) {
    console.log("reducer", action);

    switch (action.type) {
        case "inc":
            return { count: state.count + 1 };

        case "dec":
            return { count: state.count - 1 };

        default:
            return state;
    }
}

function renderLayout(store: Store) {
    const rootElement = document.querySelector("#root");
    for (let i = rootElement.childNodes.length - 1; i >= 0; i--)
        rootElement.childNodes[i].remove();

    const counterElement = document.createElement("div");
    counterElement.innerHTML = "0";
    store.subscribe(() => {
        counterElement.innerHTML = store.getState()?.count || "0";
    });
    rootElement.appendChild(counterElement);

    const buttonDecElement = document.createElement("button");
    buttonDecElement.innerHTML = "Dec";
    buttonDecElement.onclick = () => {
        store.dispatch({ type: "dec" });
    };
    rootElement.appendChild(buttonDecElement);

    const buttonElement = document.createElement("button");
    buttonElement.innerHTML = "Inc";
    buttonElement.onclick = () => {
        store.dispatch({ type: "inc" });
    };
    rootElement.appendChild(buttonElement);
}

const buildStoreLog = (msg, getState) =>
    function () {
        console.log(msg, getState(), Date.now());
    };

function run() {
    const composeEnhancers = getCompose();

    const promiseM = buildPromiseMiddleware();
    const middleware = [logActionMiddleware, promiseM.middleware];

    const store = legacy_createStore(
        reducer,
        composeEnhancers(applyMiddleware.apply(null, middleware))
    );

    console.log(store);
    const logStoreState = buildStoreLog("state", store.getState);
    logStoreState();
    store.subscribe(logStoreState);

    if ("liftedStore" in store) {
        const { liftedStore } = store as { liftedStore: Store };
        const logLiftedStoreState = buildStoreLog(
            "liftedState",
            liftedStore.getState
        );
        logLiftedStoreState();

        liftedStore.subscribe(logLiftedStoreState);
    }

    renderLayout(store);

    store.dispatch({ type: "@start" });
    store.dispatch(promiseM.buildAction());
}

run();
