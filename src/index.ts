export type Phase = "ready" | "initializing" | "action" | "finalizing" | "error";

export type Initializer<S = void> = () => S;
export type Finalizer<S = void> = (state: S) => void;
export type ErrorHandler<S = void> = (
  error: unknown, phase: Phase, state: S | undefined
) => void;

export type SessionConfig<S> = Readonly<{
  /**
   * Initializes a transaction, optionally saves state.
   */
  initialize: Initializer<S>,
  /**
   * Finalizes a transaction, may use the saved state.
   */
  finalize: Finalizer<S>,
  /**
   * Handles errors occurred in transaction.
   */
  handleError?: ErrorHandler<S>,
}>;

export type Action<T, S = void> = (session: Session<S>) => T;

export class Session<S = void> {
  private initialize: Initializer<S>;
  private finalize: Finalizer<S>;
  private handleError: ErrorHandler<S> | undefined;

  private phase: Phase;

  constructor(config: SessionConfig<S>) {
    this.initialize = config.initialize;
    this.finalize = config.finalize;
    this.handleError = config.handleError;

    this.phase = "ready";
  }

  /**
   * Runs an action in transaction.
   * If the session does not have running transaction, it will starts a new one.
   * @param action An action to be run in transaction.
   */
  transact<T>(action: Action<T, S>): T {
    switch (this.phase) {
      case "ready": {
        let state: S | undefined = undefined;
        try {
          this.phase = "initializing";
          state = this.initialize.call(undefined);
          this.phase = "action";
          const res = action(this);
          this.phase = "finalizing";
          this.finalize.call(undefined, state);
          return res;
        } catch (error) {
          const phase = this.phase;
          this.phase = "error";
          if (this.handleError) {
            this.handleError.call(undefined, error, phase, state);
          }
          throw error;
        } finally {
          this.phase = "ready";
        }
      }
      case "action": {
        const res = action(this);
        return res;
      }
      default:
        throw new Error(`transact() cannot be used in ${this.phase} phase`);
    }
  }
}

export type AsyncInitializer<S = void> = () => Promise<S>;
export type AsyncFinalizer<S = void> = (state: S) => Promise<void>;
export type AsyncErrorHandler<S = void> = (
  error: unknown, phase: Phase, state: S | undefined
) => Promise<void>;

export type AsyncSessionConfig<S> = Readonly<{
  /**
   * Initializes a transaction, optionally saves state.
   */
  initialize: AsyncInitializer<S>,
  /**
   * Finalizes a transaction, may use the saved state.
   */
  finalize: AsyncFinalizer<S>,
  /**
   * Handles errors occurred in transaction.
   */
  handleError?: AsyncErrorHandler<S>,
}>;

export type AsyncAction<T, S = void> = (session: AsyncSession<S>) => Promise<T>;

/**
 * Asynchronous version of `Session`.
 */
export class AsyncSession<S = void> {
  private initialize: AsyncInitializer<S>;
  private finalize: AsyncFinalizer<S>;
  private handleError: AsyncErrorHandler<S> | undefined;

  private phase: Phase;

  constructor(config: AsyncSessionConfig<S>) {
    this.initialize = config.initialize;
    this.finalize = config.finalize;
    this.handleError = config.handleError;

    this.phase = "ready";
  }

  /**
   * Runs an action in transaction.
   * If the session does not have running transaction, it will starts a new one.
   * @param action An action to be run in transaction.
   */
  async transact<T>(action: AsyncAction<T, S>): Promise<T> {
    switch (this.phase) {
      case "ready": {
        let state: S | undefined = undefined;
        try {
          this.phase = "initializing";
          state = await this.initialize.call(undefined);
          this.phase = "action";
          const res = await action(this);
          this.phase = "finalizing";
          await this.finalize.call(undefined, state);
          return res;
        } catch (error) {
          const phase = this.phase;
          this.phase = "error";
          if (this.handleError) {
            await this.handleError.call(undefined, error, phase, state);
          }
          throw error;
        } finally {
          this.phase = "ready";
        }
      }
      case "action": {
        const res = await action(this);
        return res;
      }
      default:
        throw new Error(`transact() cannot be used in ${this.phase} phase`);
    }
  }
}
