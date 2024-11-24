const EventEmitter = require('events');

const EVENT = {
    PAGE_RELOAD: 'PAGE_RELOAD',
    FULL_PAGE_RELOAD: 'FULL_PAGE_RELOAD',
};

class EventBus extends EventEmitter {}

module.exports = {
    EventBus,
    EVENT,
};
