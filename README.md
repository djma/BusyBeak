## Quick Start

Install postgres.

Build extension:
```
npm ci
npm run prisma gen
npm run build
```

Run the server between the extension and postgres: 
```
cd server
npm ci
npm run serve
```

Then, navigate to [](chrome://extensions) and load this directory as an unpacked extension.

For development, use

```
npm run watch
```

and click `Update` after every change.
