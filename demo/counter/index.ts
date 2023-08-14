import { applyMiddleware, compose, legacy_createStore } from "redux";

function getCompose() {
    const reduxCompose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    return reduxCompose
        ? reduxCompose({
              //trace: true
          })
        : compose;
}

function reducer(state = null, action) {
    return state;
}

function run() {
    const composeEnhancers = getCompose();

    const middleware = [];
    const store = legacy_createStore(
        reducer,
        composeEnhancers(applyMiddleware.apply(null, middleware))
    );

    console.log(store);
}

run();
