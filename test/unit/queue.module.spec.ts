import { type FactoryProvider, Logger } from "@nestjs/common";
import {
	InjectNeed,
	InjectQueue,
	type NeedCheckerInterface,
	NeedService,
	QueueModule,
	QueueService,
} from "../../src/index.js";

Logger.overrideLogger(true);

const provideNameMatcher = (type: "queue" | "need", name: string) => ({
	asymmetricMatch: (v: symbol) =>
		v.description === `Provider for the ${type} named ${name}`,
	jasmineToString: () =>
		`<a symbol with description "Provider for the ${type} named ${name}">`,
});
const injectionDecoratorMatcher = (type: "queue" | "need", name: string) => ({
	asymmetricMatch: (object: object) => {
		const ref = Reflect.getMetadata(
			"self:paramtypes",
			object,
		)[0].param.forwardRef();
		return provideNameMatcher(type, name).asymmetricMatch(ref);
	},
	jasmineToString: () =>
		`<a decorator for injecting "Provider for the ${type} named ${name}">`,
});
describe(QueueModule.name, () => {
	describe(QueueModule.register.name, () => {
		it("return a module with all providers", () => {
			const module = QueueModule.register({
				queues: ["queue1", { name: "queue2" }],
				needs: [
					{
						name: "need1",
						checker: {
							isFresh: () => Promise.resolve(false),
							fetcher: () => Promise.resolve("foo"),
						} satisfies NeedCheckerInterface<string>,
					},
					{
						name: "need2",
						checker: "injectionToken",
					},
				],
			});

			expect(module.providers).toEqual([
				{
					provide: provideNameMatcher("need", "need1"),
					useValue: jasmine.any(NeedService),
				},
				{
					provide: provideNameMatcher("need", "need2"),
					useFactory: jasmine.any(Function),
					inject: ["injectionToken"],
				},
				{
					provide: provideNameMatcher("queue", "queue1"),
					useValue: jasmine.any(QueueService),
				},
				{
					provide: provideNameMatcher("queue", "queue2"),
					useValue: jasmine.any(QueueService),
				},
			]);
		});

		it("return a module with a Need factory", () => {
			class FakeNeed implements NeedCheckerInterface<string> {
				isFresh(source: string): Promise<boolean> {
					throw new Error("Method not implemented.");
				}
				fetcher(): Promise<string> {
					throw new Error("Method not implemented.");
				}
			}
			const module = QueueModule.register({
				needs: [
					{
						name: "need3",
						checker: FakeNeed,
					},
				],
			});

			expect(module.providers).toEqual([
				{
					provide: provideNameMatcher("need", "need3"),
					useFactory: jasmine.any(Function),
					inject: [FakeNeed],
				},
			]);
			expect(
				(module.providers as Array<FactoryProvider>)[0].useFactory(
					new FakeNeed(),
				),
			).toBeInstanceOf(NeedService);
		});

		it("return a global module", () => {
			const module = QueueModule.register({
				isGlobal: true,
			});

			expect(module.global).toBeTrue();
		});

		it("return a module with no provider is not configured", () => {
			const actual = QueueModule.register({});

			expect(actual.providers).toBeInstanceOf(Array);
			expect(actual.providers?.length).toBe(0);
		});

		it("return a module with no provider is not configured (empty list of queue)", () => {
			const actual = QueueModule.register({ queues: [] });

			expect(actual.providers).toBeInstanceOf(Array);
			expect(actual.providers?.length).toBe(0);
		});

		it("throw an error if the queue already exist", () => {
			expect(() => {
				QueueModule.register({
					queues: ["duplicate queue", "duplicate queue"],
				});
			}).toThrowError("Duplicate declaration for queue named duplicate queue");
		});
		it("throw an error if the need already exist", () => {
			expect(() => {
				QueueModule.register({
					needs: [
						{ name: "duplicate need", checker: "fake" },
						{ name: "duplicate need", checker: "fake2" },
					],
				});
			}).toThrowError("Duplicate declaration for need named duplicate need");
		});
	});
});

describe(InjectQueue.name, () => {
	QueueModule.register({ queues: ["injection1"] });
	it("return the true injection for the name", () => {
		const actual = InjectQueue("injection1");

		const object: { injectionProp: unknown; constructor: () => void } = {
			injectionProp: undefined,
			constructor: () => undefined,
		};
		actual(object, "injectionProp", 0);

		expect(object).toEqual(injectionDecoratorMatcher("queue", "injection1"));
	});

	it("return nothing if the queue does not exist", () => {
		const actual = InjectQueue("injection-fail");

		const object: { injectionProp: unknown; constructor: () => void } = {
			injectionProp: undefined,
			constructor: () => undefined,
		};
		actual(object, "injectionProp", 0);

		expect(
			Reflect.getMetadata("self:paramtypes", object)[0].param.forwardRef(),
		).toBeUndefined();
	});
});

describe(InjectNeed.name, () => {
	QueueModule.register({
		needs: [
			{
				name: "injection2",
				checker: {
					isFresh: () => Promise.resolve(false),
					fetcher: () => Promise.resolve("foo"),
				} satisfies NeedCheckerInterface<string>,
			},
		],
	});
	it("return the true injection for the name", () => {
		const actual = InjectNeed("injection2");

		const object: { injectionProp: unknown; constructor: () => void } = {
			injectionProp: undefined,
			constructor: () => undefined,
		};
		actual(object, "injectionProp", 0);

		expect(object).toEqual(injectionDecoratorMatcher("need", "injection2"));
	});

	it("return nothing if the need does not exist", () => {
		const actual = InjectNeed("injection-fail");

		const object: { injectionProp: unknown; constructor: () => void } = {
			injectionProp: undefined,
			constructor: () => undefined,
		};
		actual(object, "injectionProp", 0);

		expect(
			Reflect.getMetadata("self:paramtypes", object)[0].param.forwardRef(),
		).toBeUndefined();
	});
});
