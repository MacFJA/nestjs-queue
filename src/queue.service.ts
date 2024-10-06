import { Injectable } from "@nestjs/common";
import PQueue from "p-queue";

/**
 * Queue service with concurrency.
 */
@Injectable()
export class QueueService extends PQueue {
	/**
	 * @returns An AsyncIterable that trigger each time one of the task is completed
	 */
	asyncAddAll(
		...args: Parameters<PQueue["addAll"]>
	): AsyncIterable<Awaited<ReturnType<PQueue["addAll"]>>[number]> {
		const self = this;
		const generator: AsyncIterable<unknown> = (async function* () {
			for (const task of args[0]) {
				yield await self.add(task, args[1]);
			}
		})();

		return generator;
	}
}
