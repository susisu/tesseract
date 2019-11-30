# @susisu/tesseract

[![Build Status](https://travis-ci.com/susisu/tesseract.svg?branch=master)](https://travis-ci.com/susisu/tesseract)

``` shell
npm i @susisu/tesseract
# or
yarn add @susisu/tesseract
```

## Usage
### Database
Manipulating database with transaction.

``` typescript
const session = new AsyncSession({
  async initialize() {
    await begin();
  },
  async finalize() {
    await commit();
  },
  async handleError() {
    await rollback();
  },
});

await session.transact(async () => {
  await updateA(session);
  await updateB(session);
});

async function updateA(session: AsyncSession): Promise<void> {
  await session.transact(async () => {
    await updateA0(session);
    await updateA1(session);
  });
}
```

### Editor
Executing multiple edit operations while pushing at most one history to the undo buffer.

``` typescript
const session = new Session<State>({
  initialize() {
    return dumpState();
  },
  finalize(oldState: State) {
    const newState = dumpState();
    if (!newState.equals(oldState)) {
      pushHistory(oldState);
    }
  },
});

session.transact(() => {
  editA(session);
  editB(session);
});
```

### Emitter
Updating a state multiple times while emitting at most one update event.

``` typescript
const session = new Session<State>({
  initialize() {
    return dumpState();
  },
  finalize(oldState: State) {
    const newState = dumpState();
    if (!newState.equals(oldState)) {
      emitUpdate();
    }
  },
});

session.transact(() => {
  updateA(session);
  updateB(session);
});
```

## License

[MIT License](http://opensource.org/licenses/mit-license.php)

## Author

Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
