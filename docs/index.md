# Минимальный запуск - что для этого надо?

## Предполагаемый порядок

1. создать `saga` - это аналог объявления

   ```javascript
   function* mySaga() {
     /*...*/
   }
   ```

2. `createSagaMiddleware()`, `createStore()` -
   как в `redux` и `redux-saga`.

3. нужно ли `sagaMiddleware.run(mySaga)`?

4. `dispatch(launchAction)`

## Что влияет на требуемые действия в предполагаемом порядке запуска?

- нужно указать корневую `saga` от которой всё разворачивается.<br/>
  И тут есть пару аргументов:
  - `saga-runtime` должен как-то получить ссылки
    на фактические функции, которые ему исполнять.
  - `saga-runtime` всё хранит в виде объектов, т.е. о функциях, которые
    исполнять, он знает только их ид-ключи в текстовом виде
    (и текущую точку исполнения).
- нужно запустить событие, которое бы заставило `saga-runtime`
  выполнять текущие действия.

=> а какие действия являются текущими?

<br/>+ а что, если это загруженное продолжение?<br/>

- т.е. до этого была сессия работы
- в ней были запущены свои `saga-functions`
- в какой-то момент состояние зафиксировали
- и вот теперь это состояние загрузили и возобновляют работу с него.

<br/>
Выходит надо:

1. знать все `saga-functions` которые могут быть запущены.
   И это некая статика, в том смысле, что добавлять в процессе выполнения
   ещё какие-либо `saga-functions` чревато поломкой `stateTrevelInTime feature`,
   т.к. при перезапуске `saga-runtime` не сможет передать им управление.

2. неким образом знать стартовую функцию, так что-бы:

   - при чистом запуске после `dispatch(launchAction)` `saga-runtime`
     начал выполнять стартовую функцию;

   - при запуске с заданным состоянием после `dispatch(launchAction)` `saga-runtime`
     начал выполнять всё то, что у него в списке выполнения
     в загруженном состоянии есть.

3. выполнить `dispatch(launchAction)`, на запуск которого влияет:
   - наличие `redux-dev-tools`, у которого специфическая загрузка
     сохранённого состояния
   - потребность запустить без учёта `redux-dev-tools`
   - потребность запустить без автоматического `dispatch(launchAction)`

## Порядок запуска v2

1. объявить все `saga-funcions`

   ```javascript
   const mySaga1 = createSaga(
     () => {},
     () => {}
   );

   const mySaga2 = createSaga(
     () => {},
     () => {}
   );
   ```

2. `createSagaMiddleware()`, куда передать все `mySaga1`, `mySaga2`, ...
   При этом, первая в списке `mySaga1` - будет той,
   что запускаем при чистом старте.

3. `createStore(sagaMiddleware)` - подключить `sagaMiddleware` в `store`.

4. `sagaMiddleware.run(ignoreReduxDevTools = false)` - вот этот метод внутри
   должен реализовать сложную логику запуска. При этом, если его не вызвать, то
   работать всё равно должно, если руками вызвать `dispatch(launchAction)`
   (на панели `redux-dev-tools` есть возможность запускать свои события).

# Что должна делать функция `proceedMiddlewareCall()`?

## Первые предположения

Т.е. `proceedMiddlewareCall()` - это внутренняя часть `redux Middleware`.
`redux` вызывает её при каждом `dispatch(action)`.

Вот, значит:

- должен быть список ожидающих `saga-effect`
- `saga-effect` должны управляться событиями

Тогда `proceedMiddlewareCall()` должна сопоставить текущее событие `action.type`
со списком ожидаемых событий и если кто-то его ждёт, этого кого-то запустить.

## А что там в `redux-saga`?

```javascript
const proceedMiddlewareCall = (next) => (action) => {
  if (sagaMonitor && sagaMonitor.actionDispatched) {
    sagaMonitor.actionDispatched(action);
  }
  const result = next(action); // hit reducers
  channel.put(action);
  return result;
};
```

Вот такой код в `redux-saga` для этой функции.

`channel = stdChannel()` - по умолчанию такой канал.

`channel.put = input=>asap(() => { [multicastChannel()].put(input) })`

Т.е. есть `multicastChannel()` к которому можно подписаться на прослушку
событий. Т.е. по `[multicastChannel()].put(input)` - идёт оповещение
всех подписавшихся, при это возможно с фильтрацией.

И вот вопрос - откуда подписки берутся у `rootSaga`?
<br/> + да и вообще, откуда подписки в канал берутся у `saga` других?

## А что там в `redux-saga` при вызове `sagaMiddleware.run(mySaga)` происходит?

Т.е. `proceedMiddlewareCall()` берёт на себя 2 обязанности:

- сделать то, что происходит в `sagaMiddleware.run(mySaga)` - если это
  чистый запуск и сейчас происходит `dispatch(launchAction)`
- делать аналог того, что в `redux-saga` происходит в обычном режиме.

`sagaMiddleware.run(mySaga)` внутри вызывает:

```javascript
immediately(() => {
  const task = proc(
    env,
    iterator,
    context,
    effectId,
    getMetaInfo(saga),
    /* isRoot */ true,
    undefined
  );

  if (sagaMonitor) {
    sagaMonitor.effectResolved(effectId, task);
  }

  return task;
});
```

`proc(...)` -> `next()` -> `result = iterator.next(arg)`
-> `digestEffect(result.value, parentEffectId, next)`
-> `runEffect(effect, effectId, currCb)`
-> тут выбор что делать в зависимости от того что за эффект

Есть `effectRunnerMap`. Например `effectTypes.TAKE` внутри
делает `channel.take(...)`, т.е. вот тут происходит подписка.

Если это просто итератор - то у него берём следующее действие.

## Промежуточные выводы по `redux-saga`

В нём есть `packages/core/src/internal/proc.js:proc()` - функция, которая
"крутит" последовательность:

- взять у итератора следующую команду;
- выполнить команду (непосредственно сейчас либо дождаться её выполнения);
- опять взять следующий шаг у итератора, подставив ему в параметры
  результаты выполнения команды.

"Прокручивание" этой цепочки начинается из 2-х мест:

- при вызове `sagaMiddleware.run(mySaga)`;
- внутри `proceedMiddlewareCall()` при `dispatch()`. Соответственно это
  может запустить один из ожидающих эффектов, что запустит "прокручивание".

## Второе приближение

В state должна быть часть для `sagaMiddleware`. Эта часть будет хранить:

- список (в виде объекта) активных эффектов;
- дерево задач. Тут вообще начало от `rootSaga`, но нужно учитывать,
  что `rootSaga` может сделать `spawn`запустив при этом отдельную задачу (не
  привязанную к текущей).

При этом, каждый `dispatch()` вызывает `proceedMiddlewareCall()`, в котором:

- в начале получаем новое состояние
- потом проходим по всем эффектам и задачам "применяя" указания
  появившиеся в их состояниях.

Таких указаний может быть несколько. В соответствии с жизненными
циклами эффектов и задач.
