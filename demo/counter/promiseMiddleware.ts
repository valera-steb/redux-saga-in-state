const type = "promisedAction";

export const buildPromiseMiddleware = () => {
    const local = {
        before: deffer(),
        after: deffer(),
    };

    return {
        middleware: () => next => action => {
            if (action.type != type) return next(action);

            local.before.resolve();
            const state = next(action);
            local.after.resolve();
            return state;
        },

        buildAction: () => {
            local.before = deffer();
            local.after = deffer();

            local.before.then(() => console.log("before", Date.now()));
            local.after.then(() => console.log("after", Date.now()));

            return { type };
        },
    };
};

function deffer() {
    let r;
    const d = new Promise(resolve => {
        r = resolve;
    }) as Promise<any> & {
        resolve;
    };
    d.resolve = r;
    return d;
}
