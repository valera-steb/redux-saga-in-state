const attempt = (fn, ...args) => (typeof fn == "function" ? fn(...args) : null);

function buildProxy(parentPath = "", onAccess = null) {
    const handler = {
        get(target, name) {
            const path = `${parentPath}.${name}`;
            attempt(onAccess, path);
            return buildProxy(path, onAccess);
        },
    };

    return new Proxy({}, handler);
}

function testArgPath(fn) {
    let fullPath = "";
    fn(buildProxy("", path => (fullPath = path)));
    return fullPath;
}

console.log(testArgPath(o => o.a.b.c));

function subCallB<T>(fn: (s: any) => T): T {
    return fn({});
}

const service = {
    fn1: (a: string, b: number) => null,
};

const y = subCallB(() => service.fn1);
const z = y("a", 1);
