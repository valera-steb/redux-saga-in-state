export const logActionMiddleware = api => {
    console.log("api", api);
    return next => action => {
        console.log("action", action);
        return next(action);
    };
};
