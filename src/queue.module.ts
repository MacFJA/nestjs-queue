import {
	type DynamicModule,
	type FactoryProvider,
	Inject,
	type InjectionToken,
	Logger,
	Module,
	type ValueProvider,
	forwardRef,
} from "@nestjs/common";
import type { NeedCheckerInterface } from "./need-checker.js";
import { NeedService } from "./need.service.js";
import { QueueService } from "./queue.service.js";

const nameToSymbol: Array<{
	type: "queue" | "need";
	name: string;
	token: symbol;
}> = [];

function InjectSymbol(
	name: string,
	type: (typeof nameToSymbol)[number]["type"],
): ReturnType<typeof Inject> {
	return Inject(
		forwardRef(() => {
			const map = nameToSymbol.find(
				(item) => item.name === name && item.type === type,
			);
			if (map === undefined) {
				new Logger("QueueModule").error(
					`The requested "${name}" ${type} is not defined`,
				);
			}
			return map?.token;
		}),
	);
}

/**
 * Injection decorator for a queue
 * @param name The name of the queue, the same value as used to declare it in QueueModule.forRoot
 */
export function InjectQueue(
	name: string,
): ReturnType<typeof Inject<QueueService>> {
	return InjectSymbol(name, "queue");
}
/**
 * Injection decorator for a need
 * @param name The name of the need, the same value as used to declare it in QueueModule.forRoot
 */
// biome-ignore lint/suspicious/noExplicitAny: The type of need can be anything
export function InjectNeed<Type = any>(
	name: string,
): ReturnType<typeof Inject<NeedService<Type>>> {
	return InjectSymbol(name, "need");
}

/**
 * The configuration to create a need.
 */
export type NeedConfiguration<Type> = {
	/**
	 * The name of the need. Will be used for injection (@see InjectNeed())
	 */
	name: string;
	/**
	 * The checker to use to test if the value is fresh.
	 * It can be a injection token (the token name, the class name), a class instance or an object that have the `NeedCheckerInterface` shape.
	 */
	checker:
		| InjectionToken<NeedCheckerInterface<Type>>
		| NeedCheckerInterface<Type>;
};
/**
 * The configuration to create a queue.
 *
 * It can be the name of the queue that will be used for injection (@see InjectQueue()), or a configuration object if you need more control.
 */
export type QueueConfiguration =
	| {
			/**
			 * The queue of the need. Will be used for injection (@see InjectQueue())
			 */
			name: string;
			/**
			 * The `p-queue` configuration object.
			 * The full list of supported options is available on [`p-queue` Github](https://github.com/sindresorhus/p-queue?tab=readme-ov-file#options)
			 */
			options?: ConstructorParameters<typeof QueueService>[0];
	  }
	| string;

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS Module
export class QueueModule {
	/**
	 * Setup all needs and queues
	 */
	static register(configurations: {
		needs?: Array<NeedConfiguration<unknown>>;
		queues?: Array<QueueConfiguration>;
		isGlobal?: boolean;
	}): DynamicModule {
		const providers = [
			...(configurations.needs?.map((configuration) =>
				createNeedFromConfig(configuration),
			) ?? []),
			...createQueues(configurations.queues ?? []),
		];
		return {
			module: QueueModule,
			global: configurations.isGlobal ?? false,
			exports: providers.map((provider) => provider.provide),
			providers,
		};
	}
}

function noDuplicateOrFail(
	config: Pick<(typeof nameToSymbol)[number], "name" | "type">,
): never | undefined {
	const exist = nameToSymbol.find(
		(item) => item.name === config.name && item.type === config.type,
	);
	if (exist !== undefined) {
		throw new Error(
			`Duplicate declaration for ${config.type} named ${config.name}`,
		);
	}
}

function createQueues(
	configurations: Array<QueueConfiguration>,
): Array<ValueProvider<QueueService>> {
	return configurations.map((item) => {
		if (typeof item === "string") {
			return createQueueFromConfig({ name: item });
		}
		return createQueueFromConfig(item);
	});
}
function createQueueFromConfig(
	configuration: Exclude<QueueConfiguration, string>,
): ValueProvider<QueueService> {
	noDuplicateOrFail({ name: configuration.name, type: "queue" });

	const provide = Symbol(`Provider for the queue named ${configuration.name}`);
	nameToSymbol.push({
		type: "queue",
		name: configuration.name,
		token: provide,
	});

	return {
		provide: provide,
		useValue: new QueueService(configuration.options),
	} satisfies ValueProvider<QueueService>;
}
function createNeedFromConfig(
	configuration: NeedConfiguration<unknown>,
): FactoryProvider<NeedService<unknown>> | ValueProvider<NeedService<unknown>> {
	noDuplicateOrFail({ name: configuration.name, type: "need" });
	const provide = Symbol(`Provider for the need named ${configuration.name}`);
	nameToSymbol.push({
		type: "need",
		name: configuration.name,
		token: provide,
	});

	if (typeof configuration.checker === "object") {
		return {
			provide: provide,
			useValue: new NeedService(configuration.checker),
		} satisfies ValueProvider<NeedService<unknown>>;
	}
	return {
		provide: provide,
		useFactory(needed: NeedCheckerInterface<unknown>) {
			return new NeedService(needed);
		},
		inject: [configuration.checker],
	} satisfies FactoryProvider<NeedService<unknown>>;
}
