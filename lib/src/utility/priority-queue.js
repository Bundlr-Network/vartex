"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const rambda_1 = require("rambda");
const cassandra_1 = require("../database/cassandra");
const R = tslib_1.__importStar(require("rambda"));
class PriorityQueue {
    constructor(cmp) {
        this.comparator = cmp;
        this.queue = [];
    }
    sortQueue() {
        this.queue.sort(this.comparator);
    }
    entries() {
        // eslint-disable-next-line unicorn/prefer-spread
        return this.queue.slice(0); // https://stackoverflow.com/a/21514254
    }
    // just return the latest, sort to be sure
    peek() {
        this.sortQueue();
        return (0, rambda_1.head)(this.queue);
    }
    // remove the head item from the queue
    pop() {
        this.queue.shift();
        this.sortQueue;
    }
    enqueue(item) {
        this.queue.push(item);
        this.sortQueue();
    }
    isEmpty() {
        return (0, rambda_1.isEmpty)(this.queue);
    }
    getSize() {
        return this.queue.length;
    }
    // hacky solution for tx imports
    hasNoneLt(height) {
        const valsLt = R.filter((item) => item.type === "tx" && (0, cassandra_1.toLong)(item.height).lessThan(height))(this.queue);
        const answer = R.isEmpty(valsLt);
        return answer;
    }
}
exports.default = PriorityQueue;
//# sourceMappingURL=priority-queue.js.map