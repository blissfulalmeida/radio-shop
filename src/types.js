// #region OctoBrowser

// #region Profile

/**
 * @typedef {Object} Profile
 * @property {string} uuid
 * @property {string} state
 * @property {boolean} headless
 * @property {number} start_time
 * @property {string} ws_endpoint
 * @property {string} debug_port
 * @property {boolean} one_time
 * @property {number} browser_pid
 */

/**
 * {
    "uuid": "f4b4e5ff2c66493c964105145a02a360",
    "state": "STARTED",
    "headless": false,
    "start_time": 1726726354,
    "ws_endpoint": "ws://127.0.0.1:51347/devtools/browser/57c5fa0e-32f5-4f2c-bae2-f340afc9751e",
    "debug_port": "51347",
    "one_time": false,
    "browser_pid": 93801
}
 */

// #endregion

// #region Other
/**
 * @typedef {Object} BetData
 * @property {string} key
 * @property {string} stake
 * @property {string} side
 * @property {string} market
 * @property {string} team1Name
 * @property {string} team2Name
 * @property {string} odd
 * @property {string} return
 * @property {boolean | null} cashedOut
 * @property {Metadata} metadata
 */

/**
 * @typedef {Object} Metadata
 * @property {string} firstSeenAt
 * @property {string} lastSeenAt
 */

/**
 * @typedef {Object} TimedAction
 * @property {string} name
 * @property {number} [createdAt]
 * @property {number} [duration]
 */

/**
 * @typedef {Object} DurationMeasureToolReport
 * @property {number} totalDuration
 * @property {TimedAction[]} actions
 */
// #endregion
