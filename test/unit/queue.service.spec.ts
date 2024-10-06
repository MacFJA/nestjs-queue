import Sinon from "sinon";

import { QueueService } from "../../src/queue.service.js";

describe(QueueService.name, async () => {
	describe(QueueService.prototype.asyncAddAll.name, () => {
		it("return list of result", async () => {
			const queue = new QueueService();
			const list = queue.asyncAddAll([() => 1, () => 2, () => 3, () => 4]);
			const values = [];
			for await (const item of list) {
				values.push(item);
			}

			expect(values).toEqual([1, 2, 3, 4]);
		});
	});

	describe(QueueService.prototype.addAll.name, () => {
		it("return all values at once", async () => {
			const queue = new QueueService();
			const values = await queue.addAll([() => 1, () => 2, () => 3, () => 4]);

			expect(values).toEqual([1, 2, 3, 4]);
		});
	});

	describe(QueueService.prototype.add.name, () => {
		it("return a promise for the task completion", async () => {
			const queue = new QueueService();
			const value = queue.add(() => 1);

			expect(value instanceof Promise).toBeTrue();
		});

		it("resolve to the value of the task", async () => {
			const queue = new QueueService();
			const value = await queue.add(() => 1);

			expect(value).toBe(1);
		});
	});
});
