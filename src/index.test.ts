import { Session, AsyncSession } from ".";

describe("Session", () => {
  describe("#transact", () => {
    it("should initialize, run an action, and then finalize", () => {
      const calls: string[] = [];
      const s = new Session({
        initialize: () => { calls.push("initialize"); },
        finalize  : () => { calls.push("finalize"); },
      });
      s.transact(() => {
        calls.push("action");
      });
      expect(calls).toEqual(["initialize", "action", "finalize"]);
    });

    it("should pass the session itself to the action", () => {
      const s = new Session({
        initialize: () => {},
        finalize  : () => {},
      });
      const action = jest.fn();
      s.transact(action);
      expect(action).toHaveBeenCalledWith(s);
    });

    it("should be consistent if multiple transactions run", () => {
      const initialize = jest.fn(() => {});
      const finalize = jest.fn(() => {});
      const s = new Session({ initialize, finalize });
      const action = jest.fn(() => {});
      s.transact(action);
      s.transact(action);
      expect(initialize).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledTimes(2);
      expect(finalize).toHaveBeenCalledTimes(2);
    });

    it("should save state created by the initializer and pass it to the finalizer", () => {
      let state = 0;
      const initialize = jest.fn(() => state);
      const finalize = jest.fn(() => {});
      const s = new Session({ initialize, finalize });
      s.transact(() => {
        state = 1;
      });
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledWith(0);
      expect(state).toBe(1);
    });

    it("should initialize and finalize transaction only once in nested calles", () => {
      let state = 0;
      const initialize = jest.fn(() => state);
      const finalize = jest.fn(() => {});
      const s = new Session({ initialize, finalize });
      s.transact(s => {
        state = 1;
        s.transact(() => {
          state = 2;
        });
        state = 3;
      });
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledWith(0);
      expect(state).toBe(3);
    });

    it("should handle errors in initializing phase", () => {
      const err = new Error("test");
      const handleError = jest.fn(() => {});
      const s = new Session<void>({
        initialize: () => { throw err; },
        finalize  : () => {},
        handleError,
      });
      expect(() => s.transact(() => {})).toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "initializing", undefined);
    });

    it("should handle errors in action phase", () => {
      const err = new Error("test");
      const handleError = jest.fn(() => {});
      const s = new Session({
        initialize: () => 42,
        finalize  : () => {},
        handleError,
      });
      expect(() => s.transact(() => { throw err; })).toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "action", 42);
    });

    it("should handle errors in finalizing phase", () => {
      const err = new Error("test");
      const handleError = jest.fn(() => {});
      const s = new Session({
        initialize: () => 42,
        finalize  : () => { throw err; },
        handleError,
      });
      expect(() => s.transact(() => {})).toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "finalizing", 42);
    });

    it("should be consistent if another transaction is started after error occurred", () => {
      const initialize = jest.fn(() => {});
      const finalize = jest.fn(() => {});
      const handleError = jest.fn(() => {});
      const s = new Session({ initialize, finalize, handleError });
      expect(() => s.transact(() => { throw new Error("test"); })).toThrowError("test");
      const action = jest.fn(() => {});
      s.transact(action);
      expect(initialize).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledTimes(1);
    });

    it("should throw error if called in initializing phase", () => {
      const s = new Session({
        initialize: () => { s.transact(() => {}); },
        finalize  : () => {},
      });
      expect(() => s.transact(() => {}))
        .toThrowError("transact() cannot be used in initializing phase");
    });

    it("should throw error if called in finalizing phase", () => {
      const s = new Session({
        initialize: () => {},
        finalize  : () => { s.transact(() => {}); },
      });
      expect(() => s.transact(() => {}))
        .toThrowError("transact() cannot be used in finalizing phase");
    });

    it("should throw error if called in error handling phase", () => {
      const s = new Session<void>({
        initialize : () => { throw new Error("test"); },
        finalize   : () => {},
        handleError: () => { s.transact(() => {}); },
      });
      expect(() => s.transact(() => {}))
        .toThrowError("transact() cannot be used in error phase");
    });
  });
});

describe("AsyncSession", () => {
  describe("#transact", () => {
    /* eslint-disable @typescript-eslint/require-await */

    it("should initialize, run an action, and then finalize", async () => {
      const calls: string[] = [];
      const s = new AsyncSession({
        initialize: async () => { calls.push("initialize"); },
        finalize  : async () => { calls.push("finalize"); },
      });
      await s.transact(async () => {
        calls.push("action");
      });
      expect(calls).toEqual(["initialize", "action", "finalize"]);
    });

    it("should pass the session itself to the action", async () => {
      const s = new AsyncSession({
        initialize: async () => {},
        finalize  : async () => {},
      });
      const action = jest.fn(async () => {});
      await s.transact(action);
      expect(action).toHaveBeenCalledWith(s);
    });

    it("should be consistent if multiple transactions run", async () => {
      const initialize = jest.fn(async () => {});
      const finalize = jest.fn(async () => {});
      const s = new AsyncSession({ initialize, finalize });
      const action = jest.fn(async () => {});
      await s.transact(action);
      await s.transact(action);
      expect(initialize).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledTimes(2);
      expect(finalize).toHaveBeenCalledTimes(2);
    });

    it("should save state created by the initializer and pass it to the finalizer", async () => {
      let state = 0;
      const initialize = jest.fn(async () => state);
      const finalize = jest.fn(async () => {});
      const s = new AsyncSession({ initialize, finalize });
      await s.transact(async () => {
        state = 1;
      });
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledWith(0);
      expect(state).toBe(1);
    });

    it("should initialize and finalize transaction only once in nested calles", async () => {
      let state = 0;
      const initialize = jest.fn(async () => state);
      const finalize = jest.fn(async () => {});
      const s = new AsyncSession({ initialize, finalize });
      await s.transact(async s => {
        state = 1;
        await s.transact(async () => {
          state = 2;
        });
        state = 3;
      });
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledWith(0);
      expect(state).toBe(3);
    });

    it("should handle errors in initializing phase", async () => {
      const err = new Error("test");
      const handleError = jest.fn(async () => {});
      const s = new AsyncSession<void>({
        initialize: async () => { throw err; },
        finalize  : async () => {},
        handleError,
      });
      await expect(s.transact(async () => {})).rejects.toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "initializing", undefined);
    });

    it("should handle errors in action phase", async () => {
      const err = new Error("test");
      const handleError = jest.fn(async () => {});
      const s = new AsyncSession({
        initialize: async () => 42,
        finalize  : async () => {},
        handleError,
      });
      await expect(s.transact(() => { throw err; })).rejects.toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "action", 42);
    });

    it("should handle errors in finalizing phase", async () => {
      const err = new Error("test");
      const handleError = jest.fn(async () => {});
      const s = new AsyncSession({
        initialize: async () => 42,
        finalize  : async () => { throw err; },
        handleError,
      });
      await expect(s.transact(async () => {})).rejects.toThrowError("test");
      expect(handleError).toHaveBeenCalledWith(err, "finalizing", 42);
    });

    it("should be consistent if another transaction is started after error occurred", async () => {
      const initialize = jest.fn(async () => {});
      const finalize = jest.fn(async () => {});
      const handleError = jest.fn(async () => {});
      const s = new AsyncSession({ initialize, finalize, handleError });
      await expect(s.transact(() => { throw new Error("test"); })).rejects.toThrowError("test");
      const action = jest.fn(async () => {});
      await s.transact(action);
      expect(initialize).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledTimes(1);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledTimes(1);
    });

    it("should throw error if called in initializing phase", async () => {
      const s = new AsyncSession({
        initialize: async () => { await s.transact(async () => {}); },
        finalize  : async () => {},
      });
      await expect(s.transact(async () => {}))
        .rejects.toThrowError("transact() cannot be used in initializing phase");
    });

    it("should throw error if called in finalizing phase", async () => {
      const s = new AsyncSession({
        initialize: async () => {},
        finalize  : async () => { await s.transact(async () => {}); },
      });
      await expect(s.transact(async () => {}))
        .rejects.toThrowError("transact() cannot be used in finalizing phase");
    });

    it("should throw error if called in error handling phase", async () => {
      const s = new AsyncSession<void>({
        initialize : async () => { throw new Error("test"); },
        finalize   : async () => {},
        handleError: async () => { await s.transact(async () => {}); },
      });
      await expect(s.transact(async () => {}))
        .rejects.toThrowError("transact() cannot be used in error phase");
    });

    /* eslint-enable @typescript-eslint/require-await */
  });
});
