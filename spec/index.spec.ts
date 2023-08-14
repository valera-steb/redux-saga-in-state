import { createSaga, createSagaMiddleware } from "../src";
import { applyMiddleware, legacy_createStore as createStore } from "redux";

it("should run", () => {
    expect(true).toBeTruthy();
});

it("should let create and run saga", async () => {
    let hadCalled = false;
    const rootSaga = createSaga(() => {
        hadCalled = true;
    });

    const sagaMiddleware = createSagaMiddleware({
        sagas: [rootSaga],
    });
    createStore((s = null, a) => s, applyMiddleware(sagaMiddleware));

    expect(hadCalled).toBeFalsy();
    await sagaMiddleware.run();
    expect(hadCalled).toBeTruthy();
});
