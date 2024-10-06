/**
 * The interface that define a need checker.
 */
/* c8 ignore next 4 */
export interface NeedCheckerInterface<Type> {
	/**
	 * For the given `source`, indicate if its still fresh.
	 * @param source The data to check
	 * @returns `true` is the data can use, `false` if the data need to be refreshed
	 */
	isFresh(source: Type): Promise<boolean>;
	/**
	 * The function responsible to get a fresh data.
	 * It will be call whenever the data is not fresh (or not defined)
	 */
	fetcher(): Promise<Type>;
}
