import type { NeedCheckerInterface } from "./need-checker.js";

/**
 * The Need service.
 * It provide the `with` function.
 */
export class NeedService<Type> {
	/** @internal */
	private data: Type | undefined = undefined;
	/** @internal */
	private fetching: Promise<void> | false = false;

	/** @internal */
	constructor(
		/** @internal */ private readonly needed: NeedCheckerInterface<Type>,
	) {}

	/**
	 * The `with` will check if the needed data is still fresh, fetch a new version if needed, and return it.
	 *
	 * Only one fetch is done when the data is not fresh, all call that are done during the fetch will wait for the fetch to finish (and will use the content of the fetch).
	 * @returns A promise which is resolved with the (refreshed or still fresh) needed data.
	 */
	async with(): Promise<Type> {
		if (this.fetching instanceof Promise) {
			return this.fetching.then(() => this.data!);
		}

		if (this.data === undefined || !(await this.needed.isFresh(this.data!))) {
			let done: () => void;
			this.fetching = new Promise<void>((resolve) => {
				done = resolve;
			}).then(() => {
				this.fetching = false;
			});

			this.data = await this.needed.fetcher().then((result) => {
				return result;
			});
			done!();
		}
		return this.data!;
	}
}
