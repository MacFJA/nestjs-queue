# QueueModule

A Nestjs module to create queues and actions that need to check freshness of a data.

## Installation

```sh
npm install @macfja/nestjs-queue
# or
pnpm add --save @macfja/nestjs-queue
# or
yarn add --save @macfja/nestjs-queue
# or
bun add --save @macfja/nestjs-queue
```

## Usage

### Initialization

In your main module
```ts
import { QueueModule } from "@macfja/nestjs-queue"
import { Module } from "@nestjs/common"
import { Oauth2Needed } from "./oauth2need.service.ts" // See below

@Module({
  imports: [
    QueueModule.register({
      needs: [{ name: 'oauth2', needed: Oauth2Needed }],
      queues: ['oldServer']
    })
  ]
})
export class MainModule {}
```
---
Create a need checker support class
```ts
// ./oauth2need.service.ts
import { type NeedCheckerInterface } from "@macfja/nestjs-queue"

export type TokenType = {
  exp: number;
  val: string;
}

@Injectable()
export class Oauth2Needed implements NeedCheckerInterface<TokenType> {
  isFresh(token) {
    return Promise.resolve(token.exp < Date.now())
  }

  fetcher() {
    return fetch('https://myTokenEndpoint/token').then(response => response.text())
  }
}
```
### In a service / controller
```ts
import { InjectNeed, InjectQueue, NeedService, QueueService } from "@macfja/nestjs-queue"
import { type TokenType } from "./oauth2need.service.ts"

@Injectable()
export class MyService {
  constructor(
    @InjectNeed('oauth2') private readonly oauth2: NeedService<TokenType>,
    @InjectQueue('oldServer') private readonly queue: QueueService,
  ) {}

  async myNeedAction() {
    /*
     * Get a the token from the NeedChecker.
     * The value if refresh if needed.
     */
    const token = await this.oauth2.with();
    // Use the token
    const response = await fetch('https://myServer/', { headers: {
      authorization: `Bearer ${token.val}`
    }})
    return response.json()
  }

  myNeedAction2() {
    // Same as before, but in the Promise.then() form instead of the async/await
    return this.oauth2.with()
      .then(token => fetch('https://myServer/', { headers: { authorization: `Bearer ${token.token}` } }))
      .then(response => response.json())
  }

  async myQueueAction3() {
    /*
     * All previous task will first be runned.
     * Then this task will be executed, then its result will be available in the `response` variable.
     */
    const response = await this.queue.add(() => fetch('http://oldAndSlowServer')) //
    return response.json()
  }

  myQueueAction4() {
    // Same as before, but in the Promise.then() form instead of the async/await
    return this.queue
      .add(() => fetch('http://oldAndSlowServer'))
      .then(response => response.json())
  }

  async myQueueAction5() {
    /*
     * Wait for the queue to be emptied
     */
    await this.queue.wait()
    const response = await fetch('http://oldAndSlowServer')
    return response.json()
  }
}
```

## Advance usage

### Configure the queue

You can configure the behavoir of the queue by providing a configuration object instead of the queue name:
```ts
import { QueueModule } from "@macfja/nestjs-queue"
import { Module } from "@nestjs/common"

@Module({
  imports: [
    QueueModule.register({
      // 4 tasks in parallel.
      queues: [{ name: 'oldServer', { concurrency: 4 }]
    })
  ]
})
export class MainModule {}
```
> [!NOTE]
> The full list of supported options is available on [`p-queue` Github](https://github.com/sindresorhus/p-queue?tab=readme-ov-file#options)

### Inline Need checker

The NeedChecker can be set in the `QueueModule` configuration:
```ts
import { QueueModule, type NeedCheckerInterface } from "@macfja/nestjs-queue"
import { Module } from "@nestjs/common"
import { freemem } from "node:os"

@Module({
  imports: [
    QueueModule.register({
      needs: [{ name: 'memory', needed: {
        isFresh(source: number): Promise<boolean> {
          return Promise.resolve(freemem() > 4 * Math.pow(10, 6))
        },
        fetcher(): Promise<number> {
          global.gc()
          return Promise.resolve(freemem())
        }
      } satisfies NeedCheckerInterface<number> }],
    })
  ]
})
export class MainModule {}
```
### Need Checker injection
The Need checker can anything that can be injected:
- A class
- A provider token
- An instance or an object that match the NeedCheckerInterface

```ts
import { QueueModule, type NeedCheckerInterface } from "@macfja/nestjs-queue"
import { Module } from "@nestjs/common"

@Module({
  imports: [
    QueueModule.register({
      needs: [
        { name: 'byClass', needed: MyNeedCheckerClass },
        { name: 'byToken', needed: 'my-need-checker-provider-token' },
        { name: 'byInstance', needed: new MyNeedCheckerClass2() },
        { name: 'byShape', needed: {
          isFresh(source: number): Promise<boolean> { /* ... */ },
          fetcher(): Promise<number> { /*... */ }
        } satisfies NeedCheckerInterface<number>
      ],
    })
  ]
})
export class MainModule {}
```

## Notes

The queue features are based on [`p-queue`](https://github.com/sindresorhus/p-queue), but as Nestjs is not compatible with ESM module[^1], the `p-queue` dependency is injected inside the compiled source of this library.
`eventemitter3` is also a direct dependency to reduce the size of the library (`eventemitter3` is a dependency of `p-queue` but it's compatible with CJS).

This will introduce delay between the P-Queue release and when it will be available in this library

[^1]: There are several issues about the fact that Nestjs is not comaptible with ESM
    - https://github.com/nestjs/nest/issues/13319
    - https://github.com/nestjs/nest/issues/7021
    - https://github.com/nestjs/nest/issues/13851
    - https://github.com/nestjs/nest/issues/13817
    - https://github.com/nestjs/nest/issues/13557
    - https://github.com/nestjs/nest/issues/13144
    - https://github.com/nestjs/nest/issues/12102
    - https://github.com/nestjs/nest/issues/11897
    - https://github.com/nestjs/nest/issues/11046
    - https://github.com/nestjs/nest/issues/11021
    - https://github.com/nestjs/nest/issues/10846
    - https://github.com/nestjs/nest/issues/10267
    - https://github.com/nestjs/nest/issues/10239
    - https://github.com/nestjs/nest/issues/9265
    - https://github.com/nestjs/nest/issues/8775
    - https://github.com/nestjs/nest/issues/7021
    - https://github.com/nestjs/nest/pull/8736

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.

Read more in the [Contributing file](CONTRIBUTING.md)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
