# @susisu/tesseract

[![CI](https://github.com/susisu/tesseract/workflows/CI/badge.svg)](https://github.com/susisu/tesseract/actions?query=workflow%3ACI)

``` shell
npm i @susisu/tesseract
# or
yarn add @susisu/tesseract
```

## Usage
### Database
Manipulating database with transaction.

``` typescript
import { AsyncSession } from "@susisu/tesseract";

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
import { Session } from "@susisu/tesseract";

const session = new Session<State>({
  initialize() {
    return dumpState();
  },
  finalize(oldState: State) {
    pushHistoryIfUpdated(oldState);
  },
  handleError(error, phase, oldState: State | undefined) {
    if (oldState === undefined) {
      return;
    }
    pushHistoryIfUpdated(oldState);
  },
});

function pushHistoryIfUpdated(oldState: State): void {
  const newState = dumpState();
  if (!newState.equals(oldState)) {
    pushHistory(oldState);
  }
}

session.transact(() => {
  editA(session);
  editB(session);
});
```

### Emitter
Updating a state multiple times while emitting at most one update event.

``` typescript
import { Session } from "@susisu/tesseract";

const session = new Session<State>({
  initialize() {
    return dumpState();
  },
  finalize(oldState: State) {
    emitIfUpdated(oldState);
  },
  handleError(error, phase, oldState: State | undefined) {
    if (oldState === undefined) {
      return;
    }
    emitIfUpdated(oldState);
  },
});

function emitIfUpdated(oldState: State): void {
  const newState = dumpState();
  if (!newState.equals(oldState)) {
    emit();
  }
}

session.transact(() => {
  updateA(session);
  updateB(session);
});
```

## License

[MIT License](http://opensource.org/licenses/mit-license.php)

## Author

Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
