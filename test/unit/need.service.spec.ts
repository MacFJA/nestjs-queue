import { NeedService } from "../../src/need.service.js";

describe(NeedService.name, () => {
	const DELAY = 30;

	describe(NeedService.prototype.with.name, () => {
		it("wait for the lock", async () => {
			const start = Date.now();
			const service = new NeedService<string>({
				isFresh: (input: string) => Promise.resolve(false),
				fetcher: () =>
					new Promise((resolve) => setTimeout(() => resolve("foo"), DELAY)),
			});
			await service.with().then((value) => expect(value).toBe("foo"));
			expect(Date.now() - start - DELAY).toBeLessThanOrEqual(2);
		});

		it("do only one refresh at the time", async () => {
			let count = 0;
			let promise = 0;
			const service = new NeedService<string>({
				isFresh: (input: string) => Promise.resolve(false),
				fetcher: () =>
					new Promise((resolve) =>
						setTimeout(() => {
							count++;
							resolve(`foo${count}`);
						}, DELAY),
					),
			});
			service.with().then((value) => {
				expect(value).toBe("foo1");
				promise++;
			});
			const actual = await service.with().then((value) => {
				promise++;
				return value;
			});
			expect(actual).toBe("foo1");
			expect(promise).toBe(2);
		});

		it("refresh if expired", async () => {
			let count = 0;
			let promise = 0;
			const service = new NeedService<string>({
				isFresh: (input: string) => Promise.resolve(false),
				fetcher: () =>
					new Promise((resolve) =>
						setTimeout(() => {
							count++;
							resolve(`foo${count}`);
						}, DELAY),
					),
			});
			await service.with().then((value) => {
				expect(value).toBe("foo1");
				promise++;
			});
			const actual = await service.with().then((value) => {
				promise++;
				return value;
			});
			expect(actual).toBe("foo2");
			expect(promise).toBe(2);
		});
	});
});
